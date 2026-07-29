sed -i "s/currentGateIn: \([0-9]*\), status: '\([^']*\)', isAlert: \(true\|false\)/operatingDays: 'Mon - Fri', operatingHours: '07:30 - 17:00'/g" src/App.tsx
