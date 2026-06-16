# 🚀 ADHD CET6 极速反应训练系统 - 功能架构文档

---

## 1. 项目定位与核心价值

### 1.1 项目全称
**ADHD版 CET6 英语词汇瞬时反应速度训练器 V2**  
(ADHD CET6 Speed Reaction Trainer - V2)

### 1.2 核心痛点解决
| 痛点 | 解决方案 |
|------|----------|
| ADHD注意力漂移 | 高频刺激、无延迟轰炸、即时多巴胺反馈 |
| 词义激活慢（1.5-3秒） | 压缩至0.2秒内，建立瞬时条件反射 |
| 传统记忆软件枯燥 | 音游式连击系统、视觉/音效反馈 |
| 永久删除单词不合理 | 动态权重算法，自适应回流复习 |

### 1.3 技术形态
- **纯前端单文件**: HTML5 + CSS3 + Vanilla JavaScript
- **全键盘流操作**: 无鼠标依赖
- **本地持久化**: localStorage 数据存储

---

## 2. 核心架构设计

### 2.1 有限状态机 (FSM)

```
┌─────────────────────────────────────────────────────────────────┐
│                        状态机架构                               │
├─────────────────────────────────────────────────────────────────┤
│  IDLE ───(Space)──→ PLAYING ───(自动轮播)──→ SHOW_ANSWER       │
│   ↑                      │                       │             │
│   │              (K/J键) │                       │             │
│   │                      ↓                       │             │
│   │               WAIT_RESPONSE ←────────────────┘             │
│   │                      │                                     │
│   │              (K/J键) │                                     │
│   │                      ↓                                     │
│   └─────────────── NEXT_WORD ──────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

| 状态 | 描述 | 允许操作 |
|------|------|----------|
| **IDLE** | 空闲状态 | Space(启动)、M(切模式)、L(词库) |
| **PLAYING** | 播放中 | Space(暂停)、K(知道)、J(不熟)、A/D(漫游) |
| **WAIT_RESPONSE** | 等待响应 | K(知道)、J(不熟)、Space(继续) |
| **SHOW_ANSWER** | 展示答案 | Space(继续)、A/D(漫游) |

### 2.2 状态转移矩阵

| 当前状态 | 触发事件 | 目标状态 | 清除动作 |
|----------|----------|----------|----------|
| 任意 | 切速度/模式 | NEXT_WORD | invalidateSession()、clearAllTimers()、speechSynthesis.cancel() |
| IDLE | Space | PLAYING | 生成新playSessionID |
| PLAYING | Space | IDLE | 销毁Timer、静音 |
| PLAYING | 发音结束 | SHOW_ANSWER | 判断模式决定下一步 |
| WAIT_RESPONSE | K键 | NEXT_WORD | 斩杀音效、Combo++ |
| WAIT_RESPONSE | J键 | SHOW_ANSWER | 清空Combo、展开释义 |
| SHOW_ANSWER | K键 | NEXT_WORD | 解除阻塞 |

### 2.3 历史栈系统 (Linear History Stack)

```javascript
state.historyStack = [];     // 存储已抽单词索引 [102, 45, 388, 21]
state.historyPointer = -1;   // 当前位置指针
```

**操作逻辑**:
- **正常训练**: 采样新词 → push → pointer++ → 渲染
- **A键回看**: pointer-- → 直接渲染历史词
- **D键前进**: pointer++ → 直接渲染历史词（不采样）

---

## 3. 训练模式设计

### 3.1 模式总览

| 模式 | 按键 | 描述 | 核心机制 |
|------|------|------|----------|
| **模式1: 极速轰炸** | 默认 | 自动轮播单词 | EN音形→CN含义→下一词 |
| **模式2: 听力反应** | M切换 | 盲听判断 | 仅播声音→1.5秒决策窗 |
| **模式3: 阅读闪现** | M切换 | 视觉瞬时记忆 | 例句闪现1秒→抹除→判断 |
| **模式4: Boss混沌** | M切换 | 混合模式 | 随机混合前三种 |

### 3.2 速度档位

| 档位 | 语音速率 | 间隔处理 | 适用场景 |
|------|----------|----------|----------|
| 1x | 标准语速 | 默认间隔 | 热身 |
| 2x | ~1.8倍 | 压缩间隔 | 快速反应 |
| 3x | ~2.2倍(安全上限) | 极限压缩 | 极限训练 |
| 5x | 关闭TTS | 纯文字闪现 | 潜意识洗脑 |

---

## 4. 数据架构

### 4.1 单词数据结构

```javascript
{
  word: "abandon",           // 英文单词
  phonetic: "/əˈbændən/",    // 音标
  meaning: "vt. 放弃，遗弃", // 释义
  example: "...",            // 例句
  frequency: 54,             // 考频
  level: 1,                  // 难度等级(1-4)
  
  // 熟练度指标
  masteryScore: 0,           // 熟练度(-10 ~ 10)
  knownCount: 0,             // 认识次数
  unknownCount: 0,           // 不认识次数
  appearCount: 0,            // 总出现次数
  
  // 遗忘算法
  lastSeenTimeStamp: 0,      // 上次出现时间戳
  nextReviewTime: 0          // 下次建议复习时间
}
```

### 4.2 记忆复现算法

**Step 1: 基础权重**
```
BaseWeight = 11 - masteryScore
```
- 熟练度越低，权重越高，被抽到概率越大

**Step 2: 时间衰减因子**
```
TimeFactor = 1 + (CurrentTime - lastSeenTimeStamp) / 遗忘衰减跨度
FinalWeight = BaseWeight × TimeFactor
```

**Step 3: 防重机制**
- 维护20个单词的环形队列
- 队列内单词权重强制降为0

### 4.3 状态回流矩阵

| 用户操作 | masteryScore变动 | Combo处理 | nextReviewTime跨度 |
|----------|------------------|-----------|-------------------|
| K键(知道) | +1 (上限10) | +1 | 当前时间 + masteryScore × 30分钟 |
| J键(不熟) | -2 (下限-10) | 清零 | 当前时间 + 90秒 |

---

## 5. 音频调度与竞态防范

### 5.1 playSessionID 会话锁

```javascript
state.playSessionID = 0;  // 单调递增锁

function speakWordAsync(text, lang, rate) {
    const capturedSessionID = state.playSessionID;
    // 异步回调中检查:
    if (state.playSessionID !== capturedSessionID) {
        resolve({ status: "aborted" }); // 熔断陈旧会话
        return;
    }
}
```

**触发熔断的事件**:
- 切词、暂停、调速、按K/J键

### 5.2 定时器托管机制

```javascript
state.activeTimersPool = [];

function safeScheduleTimer(callback, delay) {
    const timerId = setTimeout(() => {
        state.activeTimersPool = state.activeTimersPool.filter(id => id !== timerId);
        callback();
    }, delay);
    state.activeTimersPool.push(timerId);
}

function clearAllTimers() {
    state.activeTimersPool.forEach(timerId => clearTimeout(timerId));
    state.activeTimersPool = [];
}
```

---

## 6. 键盘快捷键映射

### 6.1 核心操作区

| 按键 | 功能 | 支持状态 |
|------|------|----------|
| **Space** | 播放/暂停切换 | 全局 |
| **K** | 判定"知道" | PLAYING/WAIT_RESPONSE |
| **J** | 判定"不熟" | PLAYING/WAIT_RESPONSE |
| **A / ←** | 历史后退 | 全局 |
| **D / →** | 历史前进 | 全局 |

### 6.2 系统控制区

| 按键 | 功能 | 支持状态 |
|------|------|----------|
| **1/2/3/5** | 切换速度档位 | 全局 |
| **M** | 切换训练模式 | 全局 |
| **L** | 打开完整词库 | 全局 |
| **W** | 打开历史面板 | 全局 |
| **U** | 打开不熟词库 | 全局 |

---

## 7. 多巴胺反馈系统

### 7.1 Combo连击特效

| Combo阈值 | 视觉效果 | 称号 |
|-----------|----------|------|
| ≥5 | 颜色变化 | - |
| ≥10 | 放大+发光 | - |
| ≥20 | 绿色边框发光 | GOD MODE |
| ≥50 | 橙红色+火焰阴影 | ⚡ REACTION MASTER |
| ≥100 | 全屏极光粒子 | ☠ WORD EXECUTIONER |

### 7.2 音效反馈 (Web Audio API)

| 操作 | 波形 | 频率 | 时长 |
|------|------|------|------|
| K键(知道) | 正弦波 | 880Hz | 0.08s |
| J键(不熟) | 锯齿波 | 120Hz | 0.3s |
| 显示释义 | 正弦波 | 440Hz | 0.1s |

---

## 8. 数据持久化

### 8.1 localStorage 存储

| Key | 存储内容 | 更新策略 |
|-----|----------|----------|
| `adhd-word-progress` | 单词熟练度数据 | 3秒节流写入 |
| `adhd-unfamiliar-words` | 不熟单词列表 | 即时写入 |

### 8.2 统计面板指标

| 指标 | 描述 |
|------|------|
| 今日已刷怪数 | 本次会话总出现次数 |
| 已完全斩杀词数 | masteryScore ≥ 8 的单词数 |
| 极度薄弱词数 | masteryScore ≤ -5 的单词数 |
| 平均反应时间 | K/J键决策耗时(毫秒) |

---

## 9. 高风险Defect防御

### 9.1 输入锁机制

```javascript
state.isProcessingInput = false;

// 事件处理流程:
1. 捕获输入 → 设置 isProcessingInput = true
2. 执行状态转移
3. 新单词渲染完成 → 设置 isProcessingInput = false
```

### 9.2 模式切换语音残留

```javascript
function toggleMode() {
    state.playSessionID++;
    speechSynthesis.cancel();
    speechSynthesis.cancel(); // 双重调用确保清空
    clearAllTimers();
    // ... 切换逻辑
}
```

---

## 10. 代码架构

### 10.1 文件结构

```
NewADHDWordV2.html
├── <head>
│   ├── <style>          # 全局样式 + 动画
│   └── CSS变量定义      # 颜色主题
├── <body>
│   ├── #header          # 顶部栏(模式/速度/连击/状态)
│   ├── #main-stage      # 主训练区
│   ├── #footer          # 底部提示栏
│   ├── #fill-blank-container  # 填空模式
│   ├── #history-panel   # 历史面板(底部弹出)
│   └── #word-library-modal     # 词库弹窗
└── <script>
    ├── 常量定义         # MODES, STATE, 分类常量
    ├── 词库数据         # wordDB
    ├── 状态管理         # currentState, historyStack等
    ├── 核心函数         # transition(), displayWord(), getRandomWord()
    ├── 交互处理         # handleKeyDown()
    └── 初始化           # loadProgress(), eventListener绑定
```

### 10.2 核心函数清单

| 函数 | 职责 | 关键特性 |
|------|------|----------|
| `transition(event)` | 状态机核心 | 严格状态转移控制 |
| `getRandomWord()` | 动态加权采样 | 防重队列、时间衰减 |
| `displayWord(word)` | 单词渲染 | 更新历史栈 |
| `updateMastery(word, success)` | 熟练度更新 | 记忆曲线计算 |
| `speakWordAsync(text, lang, rate)` | 语音合成 | SessionID熔断 |
| `safeScheduleTimer(callback, delay)` | 定时器调度 | 托管防泄漏 |
| `clearAllTimers()` | 定时器清空 | 全生命周期管理 |

---

## 11. 运行方式

```bash
# 方式1: 直接双击打开
NewADHDWordV2.html

# 方式2: 本地服务器
python3 -m http.server 8000
# 访问: http://localhost:8000/NewADHDWordV2.html
```

---

**参考文档**: [需求ADHD六级词汇反应训练.md](需求ADHD六级词汇反应训练.md)  
**实现文件**: [NewADHDWordV2.html](NewADHDWordV2.html)