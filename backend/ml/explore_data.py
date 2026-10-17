
from pathlib import Path
import pandas as pd

# Load the dataset
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "Telco-Customer-Churn.csv"
df = pd.read_csv(DATA_PATH)


# 1. Display the first five rows
print("\n--- FIRST FIVE ROWS ---")
print(df.head())

# 2. Check the dataset dimensions
print("\n--- DATASET SHAPE ---")
print(df.shape)

# 3. Inspect column names and data types
print("\n--- DATASET INFORMATION ---")
df.info()

# 4. Check missing values
print("\n--- MISSING VALUES ---")
print(df.isnull().sum())

# 5. Check duplicate records
print("\n--- DUPLICATE ROWS ---")
print(df.duplicated().sum())

# 6. Check the target variable
print("\n--- CHURN DISTRIBUTION ---")
print(df["Churn"].value_counts())

print("\n--- CHURN PERCENTAGE ---")
print(df["Churn"].value_counts(normalize=True) * 100)
