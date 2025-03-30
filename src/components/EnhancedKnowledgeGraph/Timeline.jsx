import React, { useEffect } from "react";
import * as d3 from "d3";

const Timeline = ({
  timelineRef,
  timelineData,
  showTimeline,
  timelinePosition,
  setTimelinePosition,
  nodes,
}) => {
  useEffect(() => {
    if (!timelineRef.current || !showTimeline || timelineData.length === 0) {
      return;
    }

    const width = timelineRef.current.clientWidth;
    const height = 120;

    d3.select(timelineRef.current).selectAll("*").remove();

    const svg = d3
      .select(timelineRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height);

    // Background
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#1a1a2e")
      .attr("rx", 6);

    // Time scale
    const timeScale = d3
      .scaleTime()
      .domain([
        d3.min(timelineData, (d) => new Date(d.timestamp)),
        d3.max(timelineData, (d) => new Date(d.timestamp)),
      ])
      .range([60, width - 40]);

    // Grid
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${height - 30})`)
      .call(
        d3
          .axisBottom(timeScale)
          .ticks(10)
          .tickSize(-height + 40)
          .tickFormat("")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke", "#444")
          .attr("stroke-dasharray", "2,2")
      );

    // Axis
    svg
      .append("g")
      .attr("transform", `translate(0, ${height - 30})`)
      .call(
        d3
          .axisBottom(timeScale)
          .ticks(10)
          .tickFormat((d) =>
            d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
          )
      )
      .call((g) => g.select(".domain").attr("stroke", "#666"))
      .call((g) =>
        g
          .selectAll("text")
          .attr("fill", "#ddd")
          .attr("font-size", "10px")
      );

    // Group data by day
    const dataByDay = d3.rollups(
      timelineData,
      (v) => v.length,
      (d) => d3.timeDay.floor(new Date(d.timestamp))
    );

    // Y scale
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(dataByDay, (d) => d[1]) || 1])
      .range([0, 60]);

    // Bars
    svg
      .selectAll(".day-bar")
      .data(dataByDay)
      .enter()
      .append("rect")
      .attr("class", "day-bar")
      .attr("x", (d) => timeScale(d[0]) - 5)
      .attr("y", (d) => height - 35 - yScale(d[1]))
      .attr("width", 10)
      .attr("height", (d) => yScale(d[1]))
      .attr("fill", (d) => d3.interpolateViridis(Math.min(1, d[1] / 10)))
      .attr("rx", 2)
      .append("title")
      .text(
        (d) => `${d[0].toLocaleDateString()}: ${d[1]} activities`
      );

    // Event symbols
    const eventTypes = ["created", "studied", "clicked", "modified"];
    const eventSymbols = {
      created: d3.symbol().type(d3.symbolCircle).size(40),
      studied: d3.symbol().type(d3.symbolSquare).size(40),
      clicked: d3.symbol().type(d3.symbolTriangle).size(40),
      modified: d3.symbol().type(d3.symbolDiamond).size(40),
    };
    const eventColors = {
      created: "#4c8bf5",
      studied: "#0f9d58",
      clicked: "#f5b400",
      modified: "#db4437",
    };

    eventTypes.forEach((type) => {
      const typeEvents = timelineData.filter((d) => d.action === type);
      svg
        .append("g")
        .selectAll(".event")
        .data(typeEvents)
        .enter()
        .append("path")
        .attr("class", "event")
        .attr(
          "transform",
          (d) => `translate(${timeScale(new Date(d.timestamp))}, ${height - 10})`
        )
        .attr("d", eventSymbols[type])
        .attr("fill", eventColors[type])
        .attr("stroke", "#222")
        .attr("stroke-width", 0.5)
        .append("title")
        .text((d) => {
          const node = nodes.find((n) => n.id === d.nodeId);
          return `${d.action} "${node ? node.name : d.nodeId}" on ${new Date(
            d.timestamp
          ).toLocaleString()}`;
        });
    });

    // Current position marker
    const currentPos =
      timeScale.range()[0] +
      (timeScale.range()[1] - timeScale.range()[0]) * (timelinePosition / 100);

    svg
      .append("line")
      .attr("x1", currentPos)
      .attr("x2", currentPos)
      .attr("y1", 10)
      .attr("y2", height - 10)
      .attr("stroke", "#ff5555")
      .attr("stroke-width", 2);

    // Slider handle
    const sliderGroup = svg
      .append("g")
      .attr("class", "time-slider")
      .attr("transform", `translate(${currentPos}, 0)`)
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("drag", (event) => {
            const newX = Math.max(
              timeScale.range()[0],
              Math.min(event.x, timeScale.range()[1])
            );
            const newPos =
              ((newX - timeScale.range()[0]) /
                (timeScale.range()[1] - timeScale.range()[0])) *
              100;
            setTimelinePosition(newPos);
          })
      );

    sliderGroup
      .append("rect")
      .attr("x", -5)
      .attr("y", 5)
      .attr("width", 10)
      .attr("height", height - 15)
      .attr("fill", "rgba(255, 85, 85, 0.3)")
      .attr("rx", 2);

    sliderGroup
      .append("circle")
      .attr("cy", height - 30)
      .attr("r", 8)
      .attr("fill", "#ff5555");
  }, [timelineData, showTimeline, timelinePosition, timelineRef, nodes, setTimelinePosition]);

  return <div className="bg-gray-800 relative" ref={timelineRef} style={{ height: "120px" }} />;
};

export default Timeline;
