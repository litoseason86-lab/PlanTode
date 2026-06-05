export function renderDailyReport(args: {
  date: string;
  totalTasks: number;
  doneCount: number;
  notDoneCount: number;
  totalSeconds: number;
  topCategoryName: string;
  categoryDurationLines: string[];
}): string {
  const totalMinutes = Math.floor(args.totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const ratio = args.totalTasks > 0 ? Math.round((args.doneCount / args.totalTasks) * 100) : 0;

  return `## 📊 ${args.date} 每日执行状态报告

### 一、 任务完成情况概要
- **计划任务总数**： ${args.totalTasks} 个
- **已完成任务数**： ${args.doneCount} 个
- **未完成任务数**： ${args.notDoneCount} 个
- **计划执行完成率**： ${ratio}%

### 二、 深度专注时长分析
- **今日累计专注时间**： ${hours}小时 ${minutes}分钟
- **投入精力最多的领域**： **${args.topCategoryName}**

**各板块专注明细：**
${args.categoryDurationLines.join('\n') || '今天没有记录任何类别的专注计时。建议通过专注引擎记录您的工作。'}`;
}

export function renderWeeklyReview(args: {
  weekStart: string;
  weekEnd: string;
  totalTasks: number;
  doneCount: number;
  notDoneCount: number;
  completionRate: number;
  totalSeconds: number;
  maxStreak: number;
  categoryTaskLines: string[];
  categoryDurationLines: string[];
  summary: string;
  advice: string;
}): string {
  const totalMinutes = Math.floor(args.totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `## 📅 周度深度复盘与效率周志 (第 [${args.weekStart} ~ ${args.weekEnd}] 周)

### 一、 本周指标硬数据汇总
- **任务规划总量**： ${args.totalTasks} 个
- **顺利执行完成**： ${args.doneCount} 个  *(完成率：${args.completionRate}%)*
- **未达预期滞留**： ${args.notDoneCount} 个
- **本周总计时深度专注**： ${hours}小时 ${minutes}分钟
- **单周任务100%全清零天数**： ${args.maxStreak} 天

### 二、 业务分类看板 & 精力流向
**1. 任务规划分布：**
${args.categoryTaskLines.join('\n') || '暂无分类任务排期。'}

**2. 专注力投入流向：**
${args.categoryDurationLines.join('\n') || '暂无专注明细。'}

### 三、 总结评估与发展指南
* **本周评语**： ${args.summary}
* **下周高效行动指引**： ${args.advice}`;
}

