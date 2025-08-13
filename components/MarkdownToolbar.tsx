import React from 'react';
import { Italic as ItalicsIcon, Type, BedDouble as ThoughtBubble, Navigation, Clock, Heart, Sparkles, Music, Eye } from 'lucide-react';

interface ExtraButton {
  icon: React.ComponentType<any>;
  label: string;
  format?: string;
  tooltip?: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}

interface MarkdownToolbarProps {
  onFormat: (type: string) => void;
  disabled?: boolean;
  extraButtons?: Array<ExtraButton>;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onFormat, disabled, extraButtons = [] }) => {
  const buttons: ExtraButton[] = [
    { icon: ItalicsIcon, label: 'Stage Direction', format: '_', tooltip: 'Add stage direction (e.g. _smiles warmly_)' },
    { icon: ThoughtBubble, label: 'Inner Thought', format: '>', tooltip: 'Add inner monologue (e.g. > thinking deeply)' },
    { icon: Navigation, label: 'Spatial', format: '~', tooltip: 'Add spatial direction (e.g. ~moves closer~)' },
    { icon: Clock, label: 'Temporal', format: '⌛' , tooltip: 'Add temporal cue (e.g. [time: pauses briefly])' },
    { icon: Heart, label: 'Emotional', format: '♥' , tooltip: 'Add emotional state (e.g. [feeling: excited])' },
    { icon: Sparkles, label: 'Action', format: '⚡' , tooltip: 'Add action (e.g. [action: jumps excitedly])' },
    { icon: Music, label: 'Tone', format: '♪', tooltip: 'Add tone of voice (e.g. [tone: speaking softly])' },
    { icon: Eye, label: 'Perception', format: '[notices: ]', tooltip: 'Add perception (e.g. [notices: the details])' },
    { icon: Type, label: 'Emphasis', format: '**', tooltip: 'Add emphasis (e.g. **very important**)' }
  ];

  const handleClick = (e: React.MouseEvent, btn: ExtraButton) => {
    e.preventDefault();
    if (btn.onClick) {
      btn.onClick(e);
      return;
    }
    if (btn.format) {
      onFormat(btn.format);
    }
  };

  const all: ExtraButton[] = [...extraButtons, ...buttons];

  return (
    <div className="flex flex-wrap justify-center gap-1 p-2 bg-muted rounded-lg border border-border mb-2">
      {all.map((btn) => {
        const { icon: Icon, label, tooltip, active } = btn;
        return (
          <button
            key={label}
            onClick={(e) => handleClick(e, btn)}
            type="button"
            disabled={disabled}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative ${active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'}`}
            title={tooltip}
          >
            <Icon className={`w-4 h-4 ${active ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'}`} />
            <span className="sr-only">{label}</span>
            {tooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border">
                {tooltip}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MarkdownToolbar;
