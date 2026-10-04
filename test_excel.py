import pandas as pd
import sys

file_path = "../öğretmen el programı deneme.xlsx"
df = pd.read_excel(file_path, header=None)

# Print first 30 rows, all columns
for i, row in df.head(30).iterrows():
    print(f"Row {i}:", row.tolist())
