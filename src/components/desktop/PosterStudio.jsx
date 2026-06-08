import React, { useState, useRef } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { Image, Sparkles, Download, QrCode } from 'lucide-react';

export const PosterStudio = () => {
  const [template, setTemplate] = useState('pr'); // 'pr' | 'streak' | 'level'
  const [titleText, setTitleText] = useState('NEW PR SMASHED!');
  const [statText, setStatText] = useState('Bench Press: 100kg x 5 reps');
  const [colorTheme, setColorTheme] = useState('#FF5C00'); // Orange default
  const [showQR, setShowQR] = useState(false);
  const stageRef = useRef(null);

  const handleDownload = () => {
    if (!stageRef.current) return;
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `fitdesi_milestone_${template}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-3 flex justify-between items-center">
        <div>
          <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
            <Image className="text-[var(--primary)]" size={20} />
            <span>Neubrutalist Poster Studio</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Design and download high-resolution posters to share on stories or group chats.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold">Template Type</label>
            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  setTemplate('pr');
                  setTitleText('NEW PR SMASHED!');
                  setStatText('Bench Press: 100kg x 5 reps');
                }}
                className={`flex-1 border-2 border-black px-2 py-1.5 rounded-lg font-bold uppercase transition-all ${
                  template === 'pr' ? 'bg-[var(--primary)] text-white' : 'bg-black text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                PR Card
              </button>
              <button
                onClick={() => {
                  setTemplate('streak');
                  setTitleText('CONSISTENCY UNLOCKED');
                  setStatText('30-Day Streak Maintained! 🔥');
                }}
                className={`flex-1 border-2 border-black px-2 py-1.5 rounded-lg font-bold uppercase transition-all ${
                  template === 'streak' ? 'bg-[var(--primary)] text-white' : 'bg-black text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Streak
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold">Custom Title</label>
            <input
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value.toUpperCase())}
              className="bg-black border border-[#222] px-3 py-2 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold">Stats / Highlights</label>
            <input
              type="text"
              value={statText}
              onChange={(e) => setStatText(e.target.value)}
              className="bg-black border border-[#222] px-3 py-2 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold">Border Color Accent</label>
            <div className="flex gap-2">
              {['#FF5C00', '#00D4FF', '#B5FF2D', '#FF3366'].map((color) => (
                <button
                  key={color}
                  onClick={() => setColorTheme(color)}
                  className={`w-6 h-6 rounded-full border-2 ${colorTheme === color ? 'border-white' : 'border-black'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 border-2 border-black bg-[var(--primary)] px-4 py-2.5 rounded-lg shadow-[3px_3px_0px_black] text-xs font-mono font-bold text-white uppercase hover:brightness-110 active:scale-95 transition-all"
            >
              <Download size={14} />
              <span>Download PNG</span>
            </button>
            <button
              onClick={() => setShowQR(v => !v)}
              className="flex items-center justify-center border-2 border-black bg-black px-4 py-2.5 rounded-lg shadow-[3px_3px_0px_black] text-xs font-mono font-bold text-white uppercase hover:border-[var(--primary)] active:scale-95 transition-all"
            >
              <QrCode size={14} className="text-[var(--secondary)]" />
            </button>
          </div>
        </div>

        {/* Right Side: Interactive Konva Canvas */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center border-2 border-dashed border-[#222] p-4 rounded-xl bg-black/40 min-h-[360px] relative">
          
          {showQR ? (
            <div className="flex flex-col items-center justify-center gap-4 border-2 border-black bg-[#111] p-6 rounded-2xl shadow-[4px_4px_0px_black] max-w-[240px]">
              <span className="text-[10px] font-mono text-[var(--secondary)] uppercase font-bold">Scan with phone</span>
              <div className="bg-white p-3 rounded-lg border-2 border-black shadow-[3px_3px_0px_black]">
                {/* Visual Placeholder for QR Code */}
                <svg width="120" height="120" viewBox="0 0 100 100" className="w-full h-auto">
                  <rect width="100" height="100" fill="#fff" />
                  <rect x="10" y="10" width="20" height="20" fill="#000" />
                  <rect x="70" y="10" width="20" height="20" fill="#000" />
                  <rect x="10" y="70" width="20" height="20" fill="#000" />
                  <rect x="40" y="40" width="20" height="20" fill="#000" />
                  <rect x="40" y="10" width="10" height="10" fill="#000" />
                  <rect x="70" y="40" width="10" height="10" fill="#000" />
                  <rect x="10" y="40" width="10" height="10" fill="#000" />
                  <rect x="70" y="70" width="10" height="10" fill="#000" />
                  <rect x="40" y="70" width="20" height="10" fill="#000" />
                </svg>
              </div>
              <p className="text-[9px] text-[var(--text-secondary)] font-mono text-center">
                Scan this code to save the image directly to your mobile photo library.
              </p>
            </div>
          ) : (
            <div className="border-4 border-black rounded-lg overflow-hidden shadow-[5px_5px_0px_black]">
              <Stage width={320} height={320} ref={stageRef}>
                <Layer>
                  {/* Background base */}
                  <Rect width={320} height={320} fill="#080808" />
                  
                  {/* Outer Neubrutalist Border */}
                  <Rect x={10} y={10} width={300} height={300} stroke={colorTheme} strokeWidth={4} />
                  
                  {/* Inner grid patterns */}
                  <Line points={[10, 80, 310, 80]} stroke="#111" strokeWidth={1} />
                  <Line points={[10, 160, 310, 160]} stroke="#111" strokeWidth={1} />
                  <Line points={[10, 240, 310, 240]} stroke="#111" strokeWidth={1} />
                  <Line points={[80, 10, 80, 310]} stroke="#111" strokeWidth={1} />
                  <Line points={[160, 10, 160, 310]} stroke="#111" strokeWidth={1} />
                  <Line points={[240, 10, 240, 310]} stroke="#111" strokeWidth={1} />

                  {/* Header Title Text (Neubrutalist background box) */}
                  <Group x={30} y={40}>
                    <Rect width={260} height={42} fill={colorTheme} stroke="#000" strokeWidth={2} cornerRadius={4} />
                    <Text
                      text={titleText}
                      fontSize={16}
                      fontFamily="Impact, sans-serif"
                      fill="#000"
                      x={10}
                      y={12}
                      width={240}
                      align="center"
                    />
                  </Group>

                  {/* Main Stats Block */}
                  <Group x={30} y={110}>
                    <Rect width={260} height={100} fill="#111" stroke="#000" strokeWidth={2} cornerRadius={6} />
                    
                    {/* Stat Highlight text */}
                    <Text
                      text={statText}
                      fontSize={12}
                      fontFamily="Arial, sans-serif"
                      fill="#F0F0F0"
                      x={15}
                      y={40}
                      width={230}
                      align="center"
                    />
                  </Group>

                  {/* Footer Branding */}
                  <Text
                    text="FITDESI ⚡ COMEBACK PROJECT"
                    fontSize={10}
                    fontFamily="Courier New, monospace"
                    fill="#444"
                    x={30}
                    y={280}
                    width={260}
                    align="center"
                  />
                </Layer>
              </Stage>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
