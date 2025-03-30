import React from "react";

const Sidebar = ({
  showSidebar,
  setShowSidebar,
  spaces,
  setSpaces,
  activeSpace,
  setActiveSpace,
  searchQuery,
  setSearchQuery,
  tags,
  filterTags,
  setFilterTags,
  viewMode,
  setViewMode,
  nodes,
}) => {
  // Handler for adding a new space
  const addNewSpace = () => {
    const newId = `space-${Date.now()}`;
    setSpaces((prev) => [
      ...prev,
      {
        id: newId,
        name: "New Space",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        nodes: [],
      },
    ]);
  };

  return (
    <div className="w-64 bg-gray-800 p-4 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Second Brain</h1>
        <button
          className="text-gray-400 hover:text-white"
          onClick={() => setShowSidebar(false)}
        >
          ◀
        </button>
      </div>

      {/* Spaces section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm uppercase tracking-wider text-gray-400">
            Spaces
          </h2>
          <button
            className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
            onClick={addNewSpace}
          >
            + New
          </button>
        </div>
        <div className="space-y-1 mb-4">
          {spaces.map((space) => (
            <button
              key={space.id}
              className={`flex justify-between items-center w-full px-3 py-2 rounded text-left ${
                activeSpace === space.id
                  ? "bg-blue-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              onClick={() => setActiveSpace(space.id)}
            >
              <span className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: space.color }}
                ></span>
                {space.name}
              </span>
              <span className="text-xs text-gray-400">
                {space.nodes?.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters section */}
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-2">
          Filters
        </h2>

        <div className="mb-3">
          <input
            type="text"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="mb-2">
          <label className="text-xs text-gray-400 block mb-1">Tags</label>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`text-xs px-2 py-1 rounded-full ${
                  filterTags.includes(tag)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => {
                  // Toggle tag
                  if (filterTags.includes(tag)) {
                    setFilterTags(filterTags.filter((t) => t !== tag));
                  } else {
                    setFilterTags([...filterTags, tag]);
                  }
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Options */}
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-2">
          View Mode
        </h2>
        <div className="flex justify-between">
          <button
            className={`px-3 py-1 text-sm rounded ${
              viewMode === "network" ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setViewMode("network")}
          >
            Network
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${
              viewMode === "clusters" ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setViewMode("clusters")}
          >
            Clusters
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${
              viewMode === "radial" ? "bg-blue-600" : "bg-gray-700"
            }`}
            onClick={() => setViewMode("radial")}
          >
            Radial
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-auto">
        <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-2">
          Statistics
        </h2>
        <div className="bg-gray-700 rounded p-3 text-sm">
          <div className="flex justify-between mb-1">
            <span>Total Nodes:</span>
            <span>{nodes.length}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Active Space:</span>
            <span>{spaces.find((s) => s.id === activeSpace)?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Study Time:</span>
            <span>
              {Math.floor(nodes.reduce((sum, n) => sum + n.timeActive, 0) / 60)}
              h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
