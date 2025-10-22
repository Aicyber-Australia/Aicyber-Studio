import { Panel, useReactFlow } from '@xyflow/react';
import { Route } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLayout } from '@/app/workflow/hooks/use-layout';
import { ZoomSlider } from '../../../components/zoom-slider';

export function WorkflowControls() {
  const { fitView } = useReactFlow();
  const runLayout = useLayout();

  const handleLayout = () => {
    runLayout(() => {
      fitView({ duration: 300, padding: 0.2 });
    });
  };

  return (
    <Panel
      position="bottom-left"
      className="flex items-center gap-2 bg-card text-foreground rounded-md p-1"
    >
      <ZoomSlider standalone={false} />
      <div className="h-6 w-px bg-border" />
      <Button onClick={handleLayout} variant="ghost" size="icon">
        <Route className="h-4 w-4" />
      </Button>
    </Panel>
  );
}
