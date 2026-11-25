                        <div className="space-y-2 p-1">
                          <div className="bg-[#141a24] p-2 rounded-xl border border-[#263142] space-y-1">
                            <div className="flex justify-between text-[9.5px] text-zinc-300 font-bold">
                              <span>Split Ratio</span>
                              <span className="font-mono text-cyan-300">{splitScreenConfig.splitRatio}%</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="80"
                              value={splitScreenConfig.splitRatio}
                              onChange={(e) => setSplitScreenConfig((p) => ({ ...p, enabled: true, splitRatio: Number(e.target.value) }))}
                              className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                            />
                          </div>
                          <div className="bg-[#141a24] p-2 rounded-xl border border-[#263142] space-y-1">
                            <div className="flex justify-between text-[9.5px] text-zinc-300 font-bold">
                              <span>Divider Gap</span>
                              <span className="font-mono text-cyan-300">{splitScreenConfig.gapPx}px</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="16"
                              value={splitScreenConfig.gapPx}
                              onChange={(e) => setSplitScreenConfig((p) => ({ ...p, enabled: true, gapPx: Number(e.target.value) }))}
                              className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                            />
                          </div>
                        </div>