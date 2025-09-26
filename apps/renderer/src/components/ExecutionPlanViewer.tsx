import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface ExecutionPlanViewerProps {
  xmlContent: string;
  onFormatXml?: () => void;
  onSaveAsSqlPlan?: () => void;
}

interface PlanNode {
  name: string;
  cost?: string;
  rows?: string;
  size?: string;
  children?: PlanNode[];
  attributes?: Record<string, string>;
}

const ExecutionPlanViewer: React.FC<ExecutionPlanViewerProps> = ({ xmlContent, onFormatXml, onSaveAsSqlPlan }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const parseXmlPlan = (xml: string): PlanNode[] => {
    try {
      // Extract operations from XML (simplified parsing)
      const operationMatches = xml.match(/<RelOp[^>]*>[\s\S]*?<\/RelOp>/g) || [];
      
      return operationMatches.slice(0, 20).map((op, index) => {
        const physicalOpMatch = op.match(/PhysicalOp="([^"]+)"/);
        const logicalOpMatch = op.match(/LogicalOp="([^"]+)"/);
        const estimatedCostMatch = op.match(/EstimateCPU="([^"]+)"/);
        const estimatedRowsMatch = op.match(/EstimateRows="([^"]+)"/);
        const estimatedSizeMatch = op.match(/AvgRowSize="([^"]+)"/);
        
        const name = physicalOpMatch?.[1] || logicalOpMatch?.[1] || `Operation ${index + 1}`;
        
        return {
          name,
          cost: estimatedCostMatch?.[1],
          rows: estimatedRowsMatch?.[1],
          size: estimatedSizeMatch?.[1],
          attributes: {
            'Physical Operation': physicalOpMatch?.[1] || 'N/A',
            'Logical Operation': logicalOpMatch?.[1] || 'N/A',
          }
        };
      });
    } catch (error) {
      console.error('Error parsing XML plan:', error);
      return [];
    }
  };

  const renderPlanNode = (node: PlanNode, nodeId: string, depth: number = 0) => {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={nodeId} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div 
          className="flex items-center py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
          onClick={() => toggleNode(nodeId)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 mr-2 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 mr-2 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4 mr-2" />
          )}
          
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {node.name}
              </span>
              
              {node.cost && (
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Cost: {parseFloat(node.cost).toFixed(4)}
                </span>
              )}
              
              {node.rows && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Rows: {parseInt(node.rows).toLocaleString()}
                </span>
              )}
              
              {node.size && (
                <span className="text-sm text-orange-600 dark:text-orange-400">
                  Size: {node.size}B
                </span>
              )}
            </div>
            
            {isExpanded && node.attributes && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {Object.entries(node.attributes).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="w-32 font-medium">{key}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && hasChildren && node.children?.map((child, index) => 
          renderPlanNode(child, `${nodeId}-${index}`, depth + 1)
        )}
      </div>
    );
  };

  const planNodes = parseXmlPlan(xmlContent);

  return (
    <div className="execution-plan-viewer bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📊 Execution Plan Visualization
        </h3>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'tree' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'raw' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
            }`}
          >
            Raw XML
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === 'tree' ? (
          <div className="space-y-1">
            {planNodes.length > 0 ? (
              <>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  📋 Query execution plan with {planNodes.length} operations
                </div>
                {planNodes.map((node, index) => 
                  renderPlanNode(node, `node-${index}`)
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  ⚠️ Unable to parse execution plan structure
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Switch to Raw XML view to see the complete plan data
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 rounded border">
            {/* Action Bar for Raw XML */}
            {(onFormatXml || onSaveAsSqlPlan) && (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  📄 Raw XML Execution Plan
                </div>
                <div className="flex items-center gap-2">
                  {onFormatXml && (
                    <button
                      onClick={onFormatXml}
                      className="h-6 px-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Format XML in new tab"
                    >
                      📄 Format XML
                    </button>
                  )}
                  {onSaveAsSqlPlan && (
                    <button
                      onClick={onSaveAsSqlPlan}
                      className="h-6 px-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      title="Save as .sqlplan file"
                    >
                      💾 Save .sqlplan
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="p-4">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                {xmlContent}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Tips */}
      <div className="px-4 pb-4 text-xs text-gray-500 dark:text-gray-400">
        💡 <strong>Tips:</strong> For full graphical visualization, copy the XML content and paste it into SQL Server Management Studio.
        Save as .sqlplan file to share with others.
      </div>
    </div>
  );
};

export default ExecutionPlanViewer;