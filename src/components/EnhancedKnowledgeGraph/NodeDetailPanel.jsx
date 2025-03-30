import React from "react";

const NodeDetailPanel = ({
  selectedNode,
  setSelectedNode,
  addStudySession,
  setIsAdding,
  nodes,
  setSelectedNodeExtern, 
}) => {
  if (!selectedNode) return null;

  const closePanel = () => setSelectedNode(null);

  return (
    <div className="absolute right-0 top-16 bottom-0 w-80 bg-gray-800 shadow-lg overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{selectedNode.name}</h3>
          <button className="text-gray-400 hover:text-white" onClick={closePanel}>
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">Type</div>
          <div className="flex items-center">
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{
                backgroundColor: selectedNode.isParent ? "#4c8bf5" : "#0f9d58",
              }}
            />
            <span>{selectedNode.isParent ? "Group" : selectedNode.type || "Note"}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">Time Spent</div>
          <div className="text-xl">
            {Math.floor(selectedNode.timeActive / 60)}h {selectedNode.timeActive % 60}m
          </div>
        </div>

        {selectedNode.notes && (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Notes</div>
            <div className="p-3 bg-gray-700 rounded text-sm">{selectedNode.notes}</div>
          </div>
        )}

        {selectedNode.tags && selectedNode.tags.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Tags</div>
            <div className="flex flex-wrap gap-1">
              {selectedNode.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">Created</div>
          <div className="text-sm">
            {new Date(selectedNode.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-1">Last Modified</div>
          <div className="text-sm">
            {new Date(selectedNode.lastModified).toLocaleDateString()}
          </div>
        </div>

        {selectedNode.connections && selectedNode.connections.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Connected To</div>
            <div className="space-y-1">
              {selectedNode.connections.map((connId) => {
                const connectedNode = nodes.find((n) => n.id === connId);
                return connectedNode ? (
                  <div
                    key={connId}
                    className="p-2 bg-gray-700 rounded text-sm flex justify-between cursor-pointer hover:bg-gray-600"
                    onClick={() => setSelectedNodeExtern(connectedNode)}
                  >
                    <span>{connectedNode.name}</span>
                    <span>→</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm"
            onClick={() => addStudySession(selectedNode.id, 30)}
          >
            Add 30m Study
          </button>
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
            onClick={() => {
              setIsAdding(true);
            }}
          >
            Add Child
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailPanel;
