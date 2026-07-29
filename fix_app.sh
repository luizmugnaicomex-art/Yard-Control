sed -i -e '8560,8846c\
'"$(cat final-planner-updates.tsx.part | sed 's/\\/\\\\/g' | sed 's/$/\\/g' | sed '$s/\\//')" src/App.tsx
