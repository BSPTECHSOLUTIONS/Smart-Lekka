import * as zod from "zod";
export declare const CreateExpenseBody: zod.ZodObject<{
    description: zod.ZodString;
    category: zod.ZodString;
    amount: zod.ZodNumber;
    date: zod.ZodString;
}, "strip", zod.ZodTypeAny, {
    description: string;
    category: string;
    amount: number;
    date: string;
}, {
    description: string;
    category: string;
    amount: number;
    date: string;
}>;
export declare const AddExpensePaymentBody: zod.ZodObject<{
    amountPaid: zod.ZodNumber;
}, "strip", zod.ZodTypeAny, {
    amountPaid: number;
}, {
    amountPaid: number;
}>;
export declare const AddExpensePaymentParams: zod.ZodObject<{
    id: zod.ZodNumber;
}, "strip", zod.ZodTypeAny, {
    id: number;
}, {
    id: number;
}>;
export declare const ExpenseItem: zod.ZodObject<{
    id: zod.ZodNumber;
    description: zod.ZodString;
    category: zod.ZodString;
    amount: zod.ZodNumber;
    amountPaid: zod.ZodNumber;
    supervisorPaidAmount: zod.ZodNumber;
    pendingAmount: zod.ZodNumber;
    isPaid: zod.ZodBoolean;
    date: zod.ZodString;
    createdAt: zod.ZodString;
}, "strip", zod.ZodTypeAny, {
    description: string;
    category: string;
    amount: number;
    date: string;
    amountPaid: number;
    id: number;
    supervisorPaidAmount: number;
    pendingAmount: number;
    isPaid: boolean;
    createdAt: string;
}, {
    description: string;
    category: string;
    amount: number;
    date: string;
    amountPaid: number;
    id: number;
    supervisorPaidAmount: number;
    pendingAmount: number;
    isPaid: boolean;
    createdAt: string;
}>;
export declare const ListExpensesResponse: zod.ZodArray<zod.ZodObject<{
    id: zod.ZodNumber;
    description: zod.ZodString;
    category: zod.ZodString;
    amount: zod.ZodNumber;
    amountPaid: zod.ZodNumber;
    supervisorPaidAmount: zod.ZodNumber;
    pendingAmount: zod.ZodNumber;
    isPaid: zod.ZodBoolean;
    date: zod.ZodString;
    createdAt: zod.ZodString;
}, "strip", zod.ZodTypeAny, {
    description: string;
    category: string;
    amount: number;
    date: string;
    amountPaid: number;
    id: number;
    supervisorPaidAmount: number;
    pendingAmount: number;
    isPaid: boolean;
    createdAt: string;
}, {
    description: string;
    category: string;
    amount: number;
    date: string;
    amountPaid: number;
    id: number;
    supervisorPaidAmount: number;
    pendingAmount: number;
    isPaid: boolean;
    createdAt: string;
}>, "many">;
//# sourceMappingURL=expenses.d.ts.map