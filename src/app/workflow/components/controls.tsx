import { Panel } from '@xyflow/react';
import { Route } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLayout } from '@/app/workflow/hooks/use-layout';
import { ZoomSlider } from '../../../components/zoom-slider';

export function WorkflowControls() {
  const runLayout = useLayout();

  return (
    <Panel
      position="bottom-left"
      className="flex items-center gap-2 bg-card text-foreground rounded-md p-1"
    >
      <ZoomSlider standalone={false} />
      <div className="h-6 w-px bg-border" />
      <Button onClick={runLayout} variant="ghost" size="icon">
        <Route className="h-4 w-4" />
      </Button>
    </Panel>
  );
}
