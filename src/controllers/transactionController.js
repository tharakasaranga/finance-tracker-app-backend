const Transaction = require("../models/Transaction");

const createTransaction = async (req, res) => {
  try {
    const { title, amount, category, type, date, note } = req.body;

    if (!title || !amount || !category || !type || !date) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      title,
      amount,
      category,
      type,
      date,
      note,
    });

    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Transaction creation failed",
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate } = req.query;

    const filter = {
      userId: req.user._id,
    };

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }

      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(filter).sort({
      date: -1,
    });

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get transactions",
    });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { title, amount, category, type, date, note } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        title,
        amount,
        category,
        type,
        date,
        note,
      },
      {
        new: true,
      }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Transaction update failed",
    });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Transaction delete failed",
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
};