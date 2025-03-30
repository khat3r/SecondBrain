import React, { useEffect } from "react";
import * as d3 from "d3";
import _ from "lodash";

const GraphVisualizer = ({
  svgRef,
  nodes,
  links,
  activeSpace,
  viewMode,
  searchQuery,
  filterTags,
  spaces,
  selectedNode,
  setSelectedNode,
  zoomRef,
}) => {
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Create the base SVG
    const svg = d3
      .select(svgRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Zoom
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        graphGroup.attr("transform", event.transform);
        zoomRef.current = event.transform;
      });

    svg.call(zoom);

    // Main group
    const graphGroup = svg.append("g");

    // Restore previous zoom (if any)
    if (zoomRef.current) {
      svg.call(zoom.transform, zoomRef.current);
    }

    // Filtered nodes by tags
    const filteredNodes =
      filterTags.length > 0
        ? nodes.filter(
            (node) =>
              node.tags && node.tags.some((tag) => filterTags.includes(tag))
          )
        : nodes;

    // Filtered links to only those connecting the filtered nodes
    const filteredNodeIds = filteredNodes.map((n) => n.id);
    const filteredLinks = links.filter((l) => {
      const sourceId = l.source.id || l.source;
      const targetId = l.target.id || l.target;
      return (
        filteredNodeIds.includes(sourceId) && filteredNodeIds.includes(targetId)
      );
    });

    // Apply search filter
    const searchFilteredNodes = searchQuery
      ? filteredNodes.filter((node) => {
          const inName = node.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          const inNotes =
            node.notes &&
            node.notes.toLowerCase().includes(searchQuery.toLowerCase());
          const inTags =
            node.tags &&
            node.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            );
          return inName || inNotes || inTags;
        })
      : filteredNodes;

    const searchFilteredNodeIds = searchFilteredNodes.map((n) => n.id);
    const searchFilteredLinks = filteredLinks.filter((l) => {
      const sourceId = l.source.id || l.source;
      const targetId = l.target.id || l.target;
      return (
        searchFilteredNodeIds.includes(sourceId) &&
        searchFilteredNodeIds.includes(targetId)
      );
    });

    // Choose layout
    let simulation;
    if (viewMode === "network") {
      // Force-directed
      simulation = d3
        .forceSimulation(searchFilteredNodes)
        .force(
          "link",
          d3
            .forceLink(searchFilteredLinks)
            .id((d) => d.id)
            .distance((d) => 100 / (d.source.level || 1))
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(60));
    } else if (viewMode === "clusters") {
      // Clustering by the first tag
      const tagGroups = _.groupBy(searchFilteredNodes, (node) => {
        if (!node.tags || node.tags.length === 0) return "untagged";
        return node.tags[0];
      });
      const gridSize = Math.ceil(
        Math.sqrt(Object.keys(tagGroups).length || 1)
      );
      const clusterWidth = width / gridSize;
      const clusterHeight = height / gridSize;

      Object.entries(tagGroups).forEach(([tag, groupNodes], i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const centerX = col * clusterWidth + clusterWidth / 2;
        const centerY = row * clusterHeight + clusterHeight / 2;

        groupNodes.forEach((node) => {
          node.fx =
            centerX + (Math.random() - 0.5) * clusterWidth * 0.8;
          node.fy =
            centerY + (Math.random() - 0.5) * clusterHeight * 0.8;
        });
      });

      simulation = d3
        .forceSimulation(searchFilteredNodes)
        .force(
          "link",
          d3.forceLink(searchFilteredLinks).id((d) => d.id).distance(50)
        )
        .force("charge", d3.forceManyBody().strength(-100))
        .force("collision", d3.forceCollide().radius(30));
    } else if (viewMode === "radial") {
      // Radial layout
      const rootNodes = searchFilteredNodes.filter((n) => !n.parentId);
      const nonRootNodes = searchFilteredNodes.filter((n) => n.parentId);

      // Circle for root nodes
      const rootCount = rootNodes.length;
      rootNodes.forEach((node, i) => {
        const angle = (i / rootCount) * 2 * Math.PI;
        const radius = height / 3;
        node.fx = width / 2 + radius * Math.cos(angle);
        node.fy = height / 2 + radius * Math.sin(angle);
      });

      // Freed non-root
      nonRootNodes.forEach((node) => {
        node.fx = null;
        node.fy = null;
      });

      simulation = d3
        .forceSimulation(searchFilteredNodes)
        .force(
          "link",
          d3
            .forceLink(searchFilteredLinks)
            .id((d) => d.id)
            .distance((d) => (d.type === "hierarchy" ? 70 : 150))
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force("collision", d3.forceCollide().radius(40));
    }

    // Links
    const link = graphGroup
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(searchFilteredLinks)
      .enter()
      .append("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value) * 1.5)
      .attr("stroke", (d) => {
        if (d.type === "hierarchy") {
          const opacity = Math.min(0.8, Math.max(0.3, d.timeActive / 60));
          return `rgba(100, 200, 255, ${opacity})`;
        } else {
          const opacity = Math.min(0.7, Math.max(0.2, d.timeActive / 40));
          return `rgba(180, 180, 220, ${opacity})`;
        }
      })
      .attr("stroke-dasharray", (d) =>
        d.type === "connection" ? "5,5" : ""
      );

    // Nodes (group)
    const node = graphGroup
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(searchFilteredNodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        // We call setSelectedNode here
        setSelectedNode(d);
      })
      .on("dblclick", (event, d) => {
        // Double click to pin/unpin
        d.fx = d.fx ? null : d.x;
        d.fy = d.fy ? null : d.y;
      });

    // Glow filter
    const defs = svg.append("defs");
    const filter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Circles
    node
      .append("circle")
      .attr("r", (d) => {
        if (d.isParent) return 25;
        if (d.connections && d.connections.length > 2) return 20;
        if (d.timeActive > 60) return 18;
        return 12;
      })
      .attr("fill", (d) => {
        const space = spaces.find((s) => s.id === d.spaceId);
        const baseColor = space ? space.color : "#4c8bf5";

        if (d.isParent) {
          // parent
          return d3.interpolateViridis(Math.min(1, d.timeActive / 60));
        } else if (d.type === "resource") {
          return d3.interpolatePlasma(Math.min(1, d.timeActive / 40));
        } else {
          const activity = Math.min(1, d.timeActive / 30);
          return d3.interpolateRgb(d3.rgb(baseColor).darker(1), d3.rgb(baseColor))(activity);
        }
      })
      .attr("stroke", (d) => (d.isParent ? "#fff" : "#ccc"))
      .attr("stroke-width", (d) => (d.selected ? 3 : 1.5))
      .attr("filter", (d) => (d.timeActive > 30 ? "url(#glow)" : ""))
      .attr("opacity", (d) => {
        if (d.lastModified) {
          const daysSinceModified =
            (new Date() - new Date(d.lastModified)) / (1000 * 60 * 60 * 24);
          return Math.max(0.6, 1 - daysSinceModified / 60);
        }
        return 0.9;
      });

    // Node icon text
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", (d) => (d.isParent ? "#fff" : "#f0f0f0"))
      .style("font-family", "'Font Awesome 5 Free', sans-serif")
      .style("font-weight", "900")
      .style("font-size", (d) => (d.isParent ? "12px" : "10px"))
      .text((d) => {
        if (d.type === "resource") return "📚";
        if (d.type === "project") return "📋";
        if (d.type === "concept") return "💭";
        if (d.isParent) return "🔍";
        return "📝";
      });

    // Pulse for recently active
    node
      .filter(
        (d) =>
          d.timeActive > 20 &&
          new Date(d.lastModified) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      .append("circle")
      .attr("r", (d) => {
        if (d.isParent) return 25 + 5;
        if (d.connections && d.connections.length > 2) return 20 + 5;
        return 15 + 5;
      })
      .attr("fill", "none")
      .attr("stroke", (d) =>
        d.isParent
          ? "rgba(255, 255, 255, 0.5)"
          : "rgba(200, 200, 255, 0.5)"
      )
      .attr("stroke-width", 1.5)
      .attr("class", "pulse");

    // Node labels
    node
      .append("text")
      .attr("dy", (d) => {
        if (d.isParent) return -25 - 8;
        if (d.connections && d.connections.length > 2) return -20 - 8;
        if (d.timeActive > 60) return -18 - 8;
        return -12 - 8;
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .style("font-size", (d) => (d.isParent ? "14px" : "12px"))
      .style("font-weight", (d) => (d.isParent ? "bold" : "normal"))
      .style("text-shadow", "0px 0px 3px rgba(0,0,0,0.8)")
      .text((d) => (d.name.length > 20 ? d.name.substring(0, 18) + "..." : d.name));

    // Tag indicators
    node
      .filter((d) => d.tags && d.tags.length > 0)
      .append("g")
      .attr("class", "tags")
      .selectAll("circle")
      .data((d) => d.tags.slice(0, 3).map((tag) => ({ tag, nodeId: d.id })))
      .enter()
      .append("circle")
      .attr("r", 4)
      .attr("cx", (d, i) => (i - 1) * 10)
      .attr("cy", (d) => {
        const nodeRef = searchFilteredNodes.find((n) => n.id === d.nodeId);
        if (nodeRef.isParent) return 25 + 10;
        if (nodeRef.connections && nodeRef.connections.length > 2) return 20 + 10;
        if (nodeRef.timeActive > 60) return 18 + 10;
        return 12 + 10;
      })
      .attr("fill", (d) => {
        const tagColors = {
          STEM: "#4c8bf5",
          science: "#0f9d58",
          creative: "#f5b400",
          visual: "#db4437",
          fundamental: "#4285f4",
        };
        return tagColors[d.tag] || "#8e8e8e";
      });

    // Time indicator
    node
      .append("text")
      .attr("dy", (d) => {
        if (d.isParent) return 25 + 20;
        if (d.connections && d.connections.length > 2) return 20 + 20;
        if (d.timeActive > 60) return 18 + 20;
        return 12 + 20;
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#ddd")
      .style("font-size", "9px")
      .style("text-shadow", "0px 0px 2px rgba(0,0,0,0.9)")
      .text((d) => {
        if (d.timeActive < 1) return "";
        return `${Math.floor(d.timeActive / 60)}h ${d.timeActive % 60}m`;
      });

    // Tooltips
    node
      .append("title")
      .text((d) => {
        let tooltip = `${d.name}\n`;
        if (d.notes) tooltip += `${d.notes}\n`;
        if (d.tags && d.tags.length > 0)
          tooltip += `Tags: ${d.tags.join(", ")}\n`;
        tooltip += `Time: ${Math.floor(d.timeActive / 60)}h ${
          d.timeActive % 60
        }m\n`;
        tooltip += `Created: ${new Date(d.createdAt).toLocaleDateString()}\n`;
        tooltip += `Modified: ${new Date(d.lastModified).toLocaleDateString()}`;
        return tooltip;
      });

    // Drag behaviors
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      if (!event.sourceEvent.ctrlKey) {
        d.fx = null;
        d.fy = null;
      }
    }

    // Hover highlight
    node.on("mouseover", function (event, d) {
      const connectedNodeIds = [
        d.id,
        ...(d.connections || []),
        d.parentId,
        ...(d.children || []),
      ].filter(Boolean);

      node.style("opacity", (n) =>
        connectedNodeIds.includes(n.id) ? 1 : 0.3
      );
      link.style("opacity", (l) => {
        const sourceId = l.source.id || l.source;
        const targetId = l.target.id || l.target;
        return sourceId === d.id || targetId === d.id ? 1 : 0.1;
      });
      link.style("stroke-width", (l) => {
        const sourceId = l.source.id || l.source;
        const targetId = l.target.id || l.target;
        return sourceId === d.id || targetId === d.id
          ? Math.sqrt(l.value) * 2.5
          : Math.sqrt(l.value) * 1.5;
      });
    });
    node.on("mouseout", function () {
      node.style("opacity", 0.9);
      link.style("opacity", 1);
      link.style("stroke-width", (l) => Math.sqrt(l.value) * 1.5);
    });

    // Tick
    simulation.nodes(searchFilteredNodes).on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Partial links going off-screen
    if (filterTags.length > 0 || searchQuery) {
      const visibleNodeIds = searchFilteredNodes.map((n) => n.id);
      const partialLinks = links.filter((l) => {
        const sourceId = l.source.id || l.source;
        const targetId = l.target.id || l.target;
        const sourceVisible = visibleNodeIds.includes(sourceId);
        const targetVisible = visibleNodeIds.includes(targetId);
        return (sourceVisible && !targetVisible) || (!sourceVisible && targetVisible);
      });

      graphGroup
        .append("g")
        .attr("class", "partial-links")
        .selectAll("line")
        .data(partialLinks)
        .enter()
        .append("line")
        .attr("stroke-width", 1)
        .attr("stroke", "rgba(100, 100, 150, 0.2)")
        .attr("stroke-dasharray", "2,2")
        .attr("x1", (d) => {
          const sourceId = d.source.id || d.source;
          if (visibleNodeIds.includes(sourceId)) {
            const node = searchFilteredNodes.find((n) => n.id === sourceId);
            return node.x;
          }
          const targetNode = searchFilteredNodes.find(
            (n) => n.id === (d.target.id || d.target)
          );
          return targetNode.x + (Math.random() - 0.5) * 100;
        })
        .attr("y1", (d) => {
          const sourceId = d.source.id || d.source;
          if (visibleNodeIds.includes(sourceId)) {
            const node = searchFilteredNodes.find((n) => n.id === sourceId);
            return node.y;
          }
          const targetNode = searchFilteredNodes.find(
            (n) => n.id === (d.target.id || d.target)
          );
          return targetNode.y + (Math.random() - 0.5) * 100;
        })
        .attr("x2", (d) => {
          const targetId = d.target.id || d.target;
          if (visibleNodeIds.includes(targetId)) {
            const node = searchFilteredNodes.find((n) => n.id === targetId);
            return node.x;
          }
          const sourceNode = searchFilteredNodes.find(
            (n) => n.id === (d.source.id || d.source)
          );
          return sourceNode.x + (Math.random() - 0.5) * 100;
        })
        .attr("y2", (d) => {
          const targetId = d.target.id || d.target;
          if (visibleNodeIds.includes(targetId)) {
            const node = searchFilteredNodes.find((n) => n.id === targetId);
            return node.y;
          }
          const sourceNode = searchFilteredNodes.find(
            (n) => n.id === (d.source.id || d.source)
          );
          return sourceNode.y + (Math.random() - 0.5) * 100;
        });
    }

    // Pulse animation
    svg.selectAll(".pulse").style("animation", "pulse 2s infinite");

    return () => {
      if (simulation) simulation.stop();
    };
  }, [
    svgRef,
    nodes,
    links,
    activeSpace,
    viewMode,
    searchQuery,
    filterTags,
    spaces,
    selectedNode,
    zoomRef,
  ]);

  return (
    <div
      ref={svgRef}
      className={`flex-1 relative ${
        // If focusMode is needed, the parent container toggles class. 
        // Here we just rely on parent styles.
        "bg-gray-900"
      }`}
      onClick={() => setSelectedNode(null)}
    />
  );
};

export default GraphVisualizer;
