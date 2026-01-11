import { z } from "zod";

export const transactionRowSchema = z.object({
  id: z.string().optional(), // For draft tracking
  date: z.string().min(1, "Date is required").refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date",
  }),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").default("EUR"),
  categoryId: z.string().min(1, "Category is required"), // We might not validate UUID strictly if empty string is passed initially
  description: z.string().optional(),
  tags: z.array(z.string()).optional(), // Array of tag names
  type: z.enum(["income", "expense"]),
});

export const transactionFormSchema = z.object({
  transactions: z.array(transactionRowSchema),
});

export type TransactionRow = z.infer<typeof transactionRowSchema>;
export type TransactionForm = z.infer<typeof transactionFormSchema>;
