const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

const createBudget = async (req, res) => {
  try {
    const { category, amount, month, year } = req.body;

    if (!category || !amount || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      category,
      amount,
      month,
      year,
    });

    res.status(201).json({
      success: true,
      message: "Budget created successfully",
      budget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Budget creation failed",
    });
  }
};

const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(budget.year, budget.month - 1, 1);
        const endDate = new Date(budget.year, budget.month, 0, 23, 59, 59);

        const result = await Transaction.aggregate([
          {
            $match: {
              userId: req.user._id,
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
              totalSpent: { $sum: "$amount" },
            },
          },
        ]);

        const spent = result.length > 0 ? result[0].totalSpent : 0;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
          ...budget.toObject(),
          spent,
          remaining: budget.amount - spent,
          percentage: Math.round(percentage),
          isExceeded: spent > budget.amount,
        };
      })
    );

    res.json({
      success: true,
      budgets: budgetsWithProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get budgets",
    });
  }
};

const updateBudget = async (req, res) => {
  try {
    const { category, amount, month, year } = req.body;

    const budget = await Budget.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        category,
        amount,
        month,
        year,
      },
      {
        new: true,
      }
    );

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.json({
      success: true,
      message: "Budget updated successfully",
      budget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Budget update failed",
    });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Budget delete failed",
    });
  }
};

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
};