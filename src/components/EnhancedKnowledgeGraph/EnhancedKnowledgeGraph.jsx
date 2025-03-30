import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import _ from "lodash";

import Sidebar from "./Sidebar";
import GraphVisualizer from "./GraphVisualizer";
import Timeline from "./Timeline";
import NodeDetailPanel from "./NodeDetailPanel";
import { generateSampleData } from "./sampleData";

const EnhancedKnowledgeGraph = () => {
  // State: spaces, activeSpace, nodes, links
  const [spaces, setSpaces] = useState([
    { id: "space-1", name: "Main Space", color: "#4c8bf5", nodes: [] },
    { id: "space-2", name: "Projects", color: "#f5b400", nodes: [] },
    { id: "space-3", name: "Research", color: "#0f9d58", nodes: [] },
    { id: "space-4", name: "Archive", color: "#db4437", nodes: [] },
  ]);
  const [activeSpace, setActiveSpace] = useState("space-1");

  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [showTimeline, setShowTimeline] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState("note");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState("network"); // 'network', 'clusters', 'radial'
  const [showSidebar, setShowSidebar] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  // Tags-based filtering
  const [tags, setTags] = useState([]);
  const [filterTags, setFilterTags] = useState([]);

  // Refs for D3 usage
  const svgRef = useRef(null);
  const timelineRef = useRef(null);
  const zoomRef = useRef(null);

  // -------------------
  // Generate links from nodes whenever `nodes` changes
  // -------------------
  useEffect(() => {
    if (nodes.length === 0) return;

    const newLinks = [];
    nodes.forEach((node) => {
      if (node.parentId) {
        newLinks.push({
          source: node.parentId,
          target: node.id,
          value: 2,
          type: "hierarchy",
          timeActive: node.timeActive,
        });
      }
      // Sibling connections
      if (node.connections) {
        node.connections.forEach((connId) => {
          const targetNode = nodes.find((n) => n.id === connId);
          if (targetNode) {
            newLinks.push({
              source: node.id,
              target: connId,
              value: 1,
              type: "connection",
              timeActive: Math.min(node.timeActive, targetNode.timeActive || 0),
              tags: [...(node.tags || []), ...(targetNode.tags || [])],
            });
          }
        });
      }
    });

    setLinks(newLinks);

    // Extract unique tags
    const allTags = _.uniq(_.flatMap(nodes, (n) => n.tags || []));
    setTags(allTags);
  }, [nodes]);

  // -------------------
  // Load sample data (one-time)
  // -------------------
  useEffect(() => {
    // Generate sample data
    const sampleData = generateSampleData();
    setNodes(sampleData.nodes);
    setTimelineData(sampleData.timeline);

    // Update spaces with node references
    setSpaces((prev) =>
      prev.map((s) => ({
        ...s,
        nodes: sampleData.nodes
          .filter((n) => n.spaceId === s.id)
          .map((n) => n.id),
      }))
    );
  }, []);

  // -------------------
  // Handle node selection changes
  // -------------------
  useEffect(() => {
    if (!selectedNode) return;
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNode.id,
      }))
    );
  }, [selectedNode]);

  // -------------------
  // Handlers
  // -------------------
  const handleNodeClick = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    setSelectedNode(node);

    // Update node activity
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            timeActive: n.timeActive + 5,
            lastModified: new Date().toISOString(),
          };
        } else if (n.isParent && n.children?.includes(nodeId)) {
          // Update parent's time
          const updatedChildren = n.children.map((childId) =>
            prevNodes.find((child) => child.id === childId)
          );
          const totalChildTime = updatedChildren.reduce(
            (sum, child) => sum + (child?.timeActive || 0),
            0
          );
          return { ...n, timeActive: totalChildTime };
        }
        return n;
      })
    );

    // Add to timeline
    setTimelineData((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        nodeId,
        action: "clicked",
        timeActive: node?.timeActive || 0,
      },
    ]);
  };

  const addNode = () => {
    if (!newNodeName.trim()) return;
    const newId = `node-${Date.now()}`;

    const newNode = {
      id: newId,
      name: newNodeName,
      parentId: selectedNode?.id || null,
      isParent: newNodeType === "parent",
      type: newNodeType,
      spaceId: activeSpace,
      children: [],
      connections: [],
      timeActive: 0,
      notes: "",
      tags: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setNodes((prevNodes) => {
      const updatedNodes = [...prevNodes, newNode];
      if (selectedNode) {
        // Update the parent’s children list
        return updatedNodes.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              children: [...(node.children || []), newId],
            };
          }
          return node;
        });
      }
      return updatedNodes;
    });

    // Update spaces
    setSpaces((prevSpaces) =>
      prevSpaces.map((s) => {
        if (s.id === activeSpace) {
          return {
            ...s,
            nodes: [...s.nodes, newId],
          };
        }
        return s;
      })
    );

    setNewNodeName("");
    setIsAdding(false);

    // Timeline creation event
    setTimelineData((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        nodeId: newId,
        action: "created",
        parentId: selectedNode?.id || null,
      },
    ]);
  };

  const connectNodes = (sourceId, targetId) => {
    if (sourceId === targetId) return;

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === sourceId) {
          const connections = [...(n.connections || [])];
          if (!connections.includes(targetId)) {
            connections.push(targetId);
          }
          return { ...n, connections };
        }
        return n;
      })
    );

    // Timeline
    setTimelineData((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        nodeId: sourceId,
        targetId,
        action: "connected",
      },
    ]);
  };

  const addStudySession = (nodeId, duration) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            timeActive: n.timeActive + duration,
            lastModified: new Date().toISOString(),
          };
        } else if (n.isParent && n.children?.includes(nodeId)) {
          // Update parent's time
          return { ...n, timeActive: n.timeActive + duration };
        }
        return n;
      })
    );

    // Timeline
    setTimelineData((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        nodeId,
        action: "studied",
        duration,
      },
    ]);
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ nodes, spaces, timelineData }, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "knowledge-network-export.json");
    linkElement.click();
  };

  const resetView = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current)
        .select("svg")
        .transition()
        .duration(750)
        .call(d3.zoom().transform, d3.zoomIdentity);
      zoomRef.current = null;
    }
  };

  // -------------------
  // Render
  // -------------------
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar (collapsible) */}
      {showSidebar && (
        <Sidebar
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          spaces={spaces}
          setSpaces={setSpaces}
          activeSpace={activeSpace}
          setActiveSpace={setActiveSpace}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          tags={tags}
          filterTags={filterTags}
          setFilterTags={setFilterTags}
          viewMode={viewMode}
          setViewMode={setViewMode}
          nodes={nodes}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center">
          {!showSidebar && (
            <button
              className="text-gray-400 hover:text-white mr-4"
              onClick={() => setShowSidebar(true)}
            >
              ▶
            </button>
          )}
          <h2 className="text-xl font-bold">
            {spaces.find((s) => s.id === activeSpace)?.name ||
              "Knowledge Network"}
          </h2>
          <div className="flex gap-3">
            <button
              className={`px-3 py-1 rounded text-sm ${
                showTimeline ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => setShowTimeline(!showTimeline)}
            >
              {showTimeline ? "Hide Timeline" : "Show Timeline"}
            </button>

            <button
              className={`px-3 py-1 rounded text-sm ${
                focusMode ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? "Exit Focus" : "Focus Mode"}
            </button>
          </div>
        </div>

        {/* The D3 Graph Visualization */}
        <GraphVisualizer
          svgRef={svgRef}
          nodes={nodes}
          links={links}
          activeSpace={activeSpace}
          viewMode={viewMode}
          searchQuery={searchQuery}
          filterTags={filterTags}
          spaces={spaces}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          zoomRef={zoomRef}
        />

        {/* Timeline (if enabled) */}
        {showTimeline && (
          <Timeline
            timelineRef={timelineRef}
            timelineData={timelineData}
            showTimeline={showTimeline}
            timelinePosition={timelinePosition}
            setTimelinePosition={setTimelinePosition}
            nodes={nodes}
          />
        )}

        {/* Bottom Controls */}
        <div className="bg-gray-800 p-3 flex justify-between items-center">
          {isAdding ? (
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                placeholder="Node name..."
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                autoFocus
              />
              <select
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value)}
              >
                <option value="note">Note</option>
                <option value="concept">Concept</option>
                <option value="resource">Resource</option>
                <option value="project">Project</option>
                <option value="parent">Parent (Group)</option>
              </select>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                onClick={addNode}
              >
                Add {selectedNode ? "Child" : "Node"}
              </button>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewNodeName("");
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                  onClick={() => setIsAdding(true)}
                >
                  + Add Node
                </button>
                {selectedNode && (
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm"
                    onClick={() => addStudySession(selectedNode.id, 15)}
                  >
                    + Study Time
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
                  onClick={exportData}
                >
                  Export
                </button>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
                  onClick={resetView}
                >
                  Reset View
                </button>
              </div>
            </>
          )}
        </div>

        {/* Node Detail Panel */}
        {selectedNode && (
          <NodeDetailPanel
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            addStudySession={addStudySession}
            setIsAdding={setIsAdding}
            nodes={nodes}
            setSelectedNodeExtern={setSelectedNode} // Just to navigate via connections
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedKnowledgeGraph;
