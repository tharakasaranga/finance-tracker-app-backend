const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    const transactions = await Transaction.find({ userId }).sort({
      date: -1,
    });

    const totalIncome = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    const balance = totalIncome - totalExpenses;

    const recentTransactions = transactions.slice(0, 5);

    const expenseByCategory = {};

    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        if (!expenseByCategory[item.category]) {
          expenseByCategory[item.category] = 0;
        }

        expenseByCategory[item.category] += item.amount;
      });

    const expenseChart = Object.keys(expenseByCategory).map((category) => ({
      name: category,
      value: expenseByCategory[category],
    }));

    const monthlyData = {};

    transactions.forEach((item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: key,
          income: 0,
          expense: 0,
        };
      }

      if (item.type === "income") {
        monthlyData[key].income += item.amount;
      } else {
        monthlyData[key].expense += item.amount;
      }
    });

    const monthlyChart = Object.values(monthlyData).slice(-6);

    const budgets = await Budget.find({ userId });

    const budgetChart = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(budget.year, budget.month - 1, 1);
        const endDate = new Date(budget.year, budget.month, 0, 23, 59, 59);

        const result = await Transaction.aggregate([
          {
            $match: {
              userId,
              type: "expense",
              category: budget.category,
              date: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: null,
              spent: { $sum: "$amount" },
            },
          },
        ]);

        return {
          category: budget.category,
          budget: budget.amount,
          spent: result.length > 0 ? result[0].spent : 0,
        };
      })
    );

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        balance,
        budgetCount: budgets.length,
      },
      expenseChart,
      monthlyChart,
      budgetChart,
      recentTransactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
    });
  }
};

module.exports = {
  getDashboardData,
};