import * as zod from "zod";

export const CreateExpenseBody = zod.object({
  description: zod.string(),
  category: zod.string(),
  amount: zod.number(),
  date: zod.string(),
});

export const AddExpensePaymentBody = zod.object({
  amountPaid: zod.number().positive(),
});

export const AddExpensePaymentParams = zod.object({
  id: zod.coerce.number(),
});

export const ExpenseItem = zod.object({
  id: zod.number(),
  description: zod.string(),
  category: zod.string(),
  amount: zod.number(),
  amountPaid: zod.number(),
  supervisorPaidAmount: zod.number(),
  pendingAmount: zod.number(),
  isPaid: zod.boolean(),
  date: zod.string(),
  createdAt: zod.string(),
});

export const ListExpensesResponse = zod.array(ExpenseItem);
