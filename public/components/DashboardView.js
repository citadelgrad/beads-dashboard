function DashboardView({ metrics }) {
  const {
    AreaChart,
    Area,
    BarChart,
    Bar,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
    ReferenceLine,
  } = window.Recharts;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-slate-200 shadow-md rounded text-xs">
          <p className="font-bold">{data.title}</p>
          <p>{data.id}</p>
          {data.cycleTime !== undefined && <p>Cycle Time: {data.cycleTime} days</p>}
          {data.age !== undefined && <p>Age: {data.age} days</p>}
          {data.closedDateStr && <p>Closed: {data.closedDateStr}</p>}
          {data.status && <p>Status: {data.status}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card border-l-4 border-l-orange-500">
          <div className="text-xs font-bold text-slate-400 uppercase">
            Avg Work Age
          </div>
          <div className="text-3xl font-black text-slate-800">
            {metrics.avgAge}{" "}
            <span className="text-sm font-normal text-slate-400">days</span>
          </div>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <div className="text-xs font-bold text-slate-400 uppercase">
            Active WIP
          </div>
          <div className="text-3xl font-black text-slate-800">
            {metrics.openCount}
          </div>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <div className="text-xs font-bold text-slate-400 uppercase">
            Stale (30d+)
          </div>
          <div className="text-3xl font-black text-slate-800">
            {metrics.ageChartData[3].count}
          </div>
        </div>
        <div className="card border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-slate-400 uppercase">
            Total Days Tracked
          </div>
          <div className="text-3xl font-black text-slate-800">
            {metrics.flowChartData.length}
          </div>
        </div>
      </div>

      {/* Lead Time Scatterplot */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-bold mb-6 text-slate-700">
          Lead Time Scatterplot (Cycle Time)
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="closedDate"
              domain={["auto", "auto"]}
              name="Date Closed"
              tickFormatter={(unixTime) =>
                new Date(unixTime).toLocaleDateString()
              }
              type="number"
              fontSize={10}
            />
            <YAxis
              dataKey="cycleTime"
              name="Cycle Time"
              unit="d"
              fontSize={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={metrics.cycleTimeP50}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                position: "insideTopRight",
                value: `50th: ${metrics.cycleTimeP50}d`,
                fill: "#10b981",
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={metrics.cycleTimeP85}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{
                position: "insideTopRight",
                value: `85th: ${metrics.cycleTimeP85}d`,
                fill: "#f59e0b",
                fontSize: 10,
              }}
            />
            <Scatter name="Issues" data={metrics.leadTimeData} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Aging WIP */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-bold mb-6 text-slate-700">
          Aging Work in Progress
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="status"
              type="category"
              name="Status"
              allowDuplicatedCategory={false}
              fontSize={12}
            />
            <YAxis dataKey="age" name="Age" unit="d" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name="WIP" data={metrics.agingWipData}>
              {metrics.agingWipData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* CFD */}
      <div className="card h-[400px]">
        <h3 className="text-sm font-bold mb-6 text-slate-700">
          Cumulative Flow Diagram
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={metrics.flowChartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis dataKey="date" fontSize={10} minTickGap={50} />
            <YAxis fontSize={10} />
            <Tooltip labelClassName="text-slate-800 font-bold" />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Area
              type="linear"
              dataKey="closed"
              stackId="1"
              stroke="#10b981"
              fill="#dcfce7"
              name="Completed"
            />
            <Area
              type="linear"
              dataKey="open"
              stackId="1"
              stroke="#3b82f6"
              fill="#dbeafe"
              name="WIP (Open)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Age & Throughput Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card h-80">
          <h3 className="text-sm font-bold mb-4">Work Age Distribution</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={metrics.ageChartData}>
              <XAxis dataKey="range" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {metrics.ageChartData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={["#10b981", "#3b82f6", "#f59e0b", "#ef4444"][i]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card h-80">
          <h3 className="text-sm font-bold mb-4">Daily Throughput</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={metrics.flowChartData}>
              <XAxis dataKey="date" fontSize={10} minTickGap={50} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar
                dataKey="throughput"
                fill="#64748b"
                radius={[2, 2, 0, 0]}
                name="Closed"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
