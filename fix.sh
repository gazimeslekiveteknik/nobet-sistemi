sed -i '' 's/<style>/<style dangerouslySetInnerHTML={{__html: `/' src/components/PrintableView.tsx
sed -i '' 's/          {`//' src/components/PrintableView.tsx
sed -i '' 's/          `}//' src/components/PrintableView.tsx
sed -i '' 's/<\/style>/`}} \/>/' src/components/PrintableView.tsx
