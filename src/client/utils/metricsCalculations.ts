import type {
  Issue,
  Metrics,
  LeadTimeDataPoint,
  AgingWipDataPoint,
  FlowChartDataPoint,
  AgeChartDataPoint,
} from '@shared/types';

/**
 * Calculate lead time data for closed issues
 * Returns an array of data points with cycle times for the scatterplot
 */
export function calculateLeadTime(issues: Issue[]): LeadTimeDataPoint[] {
  const closedIssues = issues.filter(
    (i) => i.status === 'closed' && i.updated_at
  );

  const leadTimeData = closedIssues
    .map((i) => {
      const created = new Date(i.created_at);
      const closed = new Date(i.updated_at!);
      const cycleTime = Math.max(
        0,
        Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        id: i.id,
        closedDate: closed.getTime(),
        closedDateStr: i.updated_at!.split('T')[0],
        cycleTime,
        title: i.title || i.id,
      };
    })
    .sort((a, b) => a.closedDate - b.closedDate);

  return leadTimeData;
}

/**
 * Calculate percentiles from an array of numbers
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentile);
  return sorted[index];
}

/**
 * Calculate aging WIP (work in progress) data
 * Returns data points for the aging WIP scatterplot with color coding
 */
export function calculateAgingWIP(issues: Issue[], today: Date = new Date()): AgingWipDataPoint[] {
  const openIssues = issues.filter((i) => i.status !== 'closed');

  return openIssues.map((i) => {
    const ageInDays = Math.floor(
      (today.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Color based on age: green <=7d, orange <=30d, red >30d
    const color = ageInDays <= 7 ? '#10b981' : ageInDays <= 30 ? '#f59e0b' : '#ef4444';

    return {
      id: i.id,
      status: i.status,
      age: ageInDays,
      title: i.title || i.id,
      color,
    };
  });
}

/**
 * Calculate age distribution buckets for open issues
 */
export function calculateAgeDistribution(issues: Issue[], today: Date = new Date()): AgeChartDataPoint[] {
  const openIssues = issues.filter((i) => i.status !== 'closed');

  const ageBuckets = { '0-7d': 0, '8-14d': 0, '15-30d': 0, '30d+': 0 };

  openIssues.forEach((i) => {
    const ageInDays = Math.floor(
      (today.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageInDays <= 7) ageBuckets['0-7d']++;
    else if (ageInDays <= 14) ageBuckets['8-14d']++;
    else if (ageInDays <= 30) ageBuckets['15-30d']++;
    else ageBuckets['30d+']++;
  });

  return Object.entries(ageBuckets).map(([range, count]) => ({
    range,
    count,
  }));
}

/**
 * Calculate cumulative flow diagram data
 * Returns an array of data points with running totals of created and closed issues
 * Fills in all dates from the earliest issue to today
 */
export function calculateCumulativeFlow(issues: Issue[], today: Date = new Date()): FlowChartDataPoint[] {
  if (issues.length === 0) return [];

  // 1. Organize activity by date
  const activityByDate: Record<string, { created: number; closed: number }> = {};
  let earliestDate = new Date(today);

  issues.forEach((i) => {
    const cDateStr = i.created_at.split('T')[0];
    const cDate = new Date(cDateStr);

    if (cDate < earliestDate) {
      earliestDate = cDate;
    }

    if (!activityByDate[cDateStr]) {
      activityByDate[cDateStr] = { created: 0, closed: 0 };
    }
    activityByDate[cDateStr].created++;

    if (i.status === 'closed' && i.updated_at) {
      const clDateStr = i.updated_at.split('T')[0];
      if (!activityByDate[clDateStr]) {
        activityByDate[clDateStr] = { created: 0, closed: 0 };
      }
      activityByDate[clDateStr].closed++;
    }
  });

  // 2. Fill in continuous timeline
  const flowChartData: FlowChartDataPoint[] = [];
  let runCreated = 0;
  let runClosed = 0;

  const iterDate = new Date(earliestDate);
  while (iterDate <= today) {
    const dateStr = iterDate.toISOString().split('T')[0];
    const dayActivity = activityByDate[dateStr] || { created: 0, closed: 0 };

    runCreated += dayActivity.created;
    runClosed += dayActivity.closed;

    flowChartData.push({
      date: dateStr,
      open: runCreated - runClosed,
      closed: runClosed,
      throughput: dayActivity.closed,
    });

    iterDate.setDate(iterDate.getDate() + 1);
  }

  return flowChartData;
}

/**
 * Calculate average age of open issues
 */
export function calculateAverageAge(issues: Issue[], today: Date = new Date()): number {
  const openIssues = issues.filter((i) => i.status !== 'closed');

  if (openIssues.length === 0) return 0;

  const totalAge = openIssues.reduce((sum, i) => {
    const ageInDays = Math.floor(
      (today.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + ageInDays;
  }, 0);

  return totalAge / openIssues.length;
}

/**
 * Main function to calculate all metrics
 * Returns a complete Metrics object for the dashboard
 */
export function calculateMetrics(issues: Issue[], today: Date = new Date()): Metrics | null {
  if (issues.length === 0) return null;

  // Filter out tombstones (deleted issues)
  const activeIssues = issues.filter((i) => i.status !== 'tombstone');

  if (activeIssues.length === 0) return null;

  const openIssues = activeIssues.filter((i) => i.status !== 'closed');
  const leadTimeData = calculateLeadTime(activeIssues);
  const agingWipData = calculateAgingWIP(activeIssues, today);
  const flowChartData = calculateCumulativeFlow(activeIssues, today);
  const ageChartData = calculateAgeDistribution(activeIssues, today);
  const avgAge = calculateAverageAge(activeIssues, today);

  // Calculate percentiles from lead time data
  const cycleTimes = leadTimeData.map((d) => d.cycleTime);
  const cycleTimeP50 = calculatePercentile(cycleTimes, 0.5);
  const cycleTimeP85 = calculatePercentile(cycleTimes, 0.85);

  return {
    avgAge: avgAge.toFixed(1),
    openCount: openIssues.length,
    cycleTimeP50,
    cycleTimeP85,
    leadTimeData,
    agingWipData,
    flowChartData,
    ageChartData,
  };
}
