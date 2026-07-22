'use server';

import { z } from "zod";
import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
});

const CreateInvoice = FormSchema.omit({
    id: true,
    date: true
});

const UpdateInvoice = FormSchema.omit({
    id: true,
    date: true
})

export async function createInvoice(formData: FormData) {
    const { amount, customerId, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        console.error(error);

        return { message: 'Database Error: Failed to Create Invoice.' }
    }

    // Revalidate the cache
    revalidatePath('/dashboard/invoices')

    // Redirect user to /dashboard/invoices homepage
    redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, formData: FormData) {
    const { amount, customerId, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });

    const amountInCents = amount * 100;

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        console.error(error);

        return { message: 'Database Error: Failed to Update Invoice.' }
    }

    // Clear the client cache and make a new server request
    revalidatePath('/dashboard/invoices')
    // Redirect the user to the invoices homepage so they can see the updated table
    redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
    // Intentionally throw an error to test and implement error handling in Chapter 12
    throw new Error('Database Error: Failed to Delete Invoice.')

    await sql`
            DELETE FROM invoices
            WHERE id = ${id}
        `;

    // See the newest data after deleting an invoice from the table
    revalidatePath('/dashboard/invoices')
}