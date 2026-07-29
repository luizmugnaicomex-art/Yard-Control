sed -i 's/{Object.keys(depotMatrix).map((depotName) => (/{depots.map((depot) => { const depotName = depot.name; return (/g' src/App.tsx
sed -i 's/<\/tr>\n                                ))} /<\/tr>\n                                );\n                              })} /g' src/App.tsx
