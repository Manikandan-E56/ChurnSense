
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Define directory paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
DATA_PATH = PROJECT_ROOT / "data" / "Telco-Customer-Churn.csv"

# Load data
df = pd.read_csv(DATA_PATH)

sns.set_theme(style="whitegrid")

# Clean TotalCharges for later analysis
df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"].astype(str).str.strip(),
    errors="coerce"
)

# Inspect data
print("Dataset shape:", df.shape)
print("\nMissing values:\n", df.isnull().sum().sort_values(ascending=False).head())

# Create a 2x2 dashboard
fig, axes = plt.subplots(2, 2, figsize=(15, 10))

# Chart 1: Overall churn distribution
sns.countplot(data=df, x="Churn", ax=axes[0, 0])
axes[0, 0].set_title("Customer Churn Distribution")
axes[0, 0].set_xlabel("Churn")
axes[0, 0].set_ylabel("Number of Customers")

# Chart 2: Churn rate by contract
contract_rates = (
    df.groupby("Contract", observed=True)["Churn"]
    .apply(lambda s: (s == "Yes").mean() * 100)
    .reset_index(name="Churn Rate (%)")
)
sns.barplot(
    data=contract_rates,
    x="Contract",
    y="Churn Rate (%)",
    ax=axes[0, 1]
)
axes[0, 1].set_title("Churn Rate by Contract Type")
axes[0, 1].tick_params(axis="x", rotation=15)

# Chart 3: Tenure by churn status
sns.boxplot(data=df, x="Churn", y="tenure", ax=axes[1, 0])
axes[1, 0].set_title("Customer Tenure vs Churn")

# Chart 4: Monthly charges by churn status
sns.histplot(
    data=df,
    x="MonthlyCharges",
    hue="Churn",
    bins=30,
    kde=True,
    element="step",
    stat="density",
    common_norm=False,
    ax=axes[1, 1]
)
axes[1, 1].set_title("Monthly Charges by Churn Status")

plt.tight_layout()

# Save charts for our project documentation
output_dir = SCRIPT_DIR / "eda_outputs"
output_dir.mkdir(parents=True, exist_ok=True)
fig.savefig(output_dir / "churn_eda.png", dpi=150, bbox_inches="tight")

plt.show()

# Print exact churn rates for analysis
print("\nOverall churn rate:")
print(f"{(df['Churn'] == 'Yes').mean() * 100:.2f}%")

print("\nChurn rate by contract:")
print(contract_rates.to_string(index=False))

print("\nMedian tenure by churn status:")
print(df.groupby("Churn", observed=True)["tenure"].median())
