CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "description" VARCHAR(160) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transaction_date" TIMESTAMPTZ(3) NOT NULL,
    "due_date" DATE,
    "paid_at" TIMESTAMPTZ(3),
    "notes" VARCHAR(1000),
    "canceled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_account_id" UUID NOT NULL,
    "destination_account_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "transfer_date" TIMESTAMPTZ(3) NOT NULL,
    "description" VARCHAR(160),
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transactions_user_id_transaction_date_idx" ON "transactions"("user_id", "transaction_date");
CREATE INDEX "transactions_user_id_status_due_date_idx" ON "transactions"("user_id", "status", "due_date");
CREATE INDEX "transactions_user_id_type_transaction_date_idx" ON "transactions"("user_id", "type", "transaction_date");
CREATE INDEX "transactions_account_id_status_transaction_date_idx" ON "transactions"("account_id", "status", "transaction_date");
CREATE INDEX "transactions_category_id_status_transaction_date_idx" ON "transactions"("category_id", "status", "transaction_date");
CREATE INDEX "transfers_user_id_transfer_date_idx" ON "transfers"("user_id", "transfer_date");
CREATE INDEX "transfers_source_account_id_transfer_date_idx" ON "transfers"("source_account_id", "transfer_date");
CREATE INDEX "transfers_destination_account_id_transfer_date_idx" ON "transfers"("destination_account_id", "transfer_date");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_different_accounts" CHECK ("source_account_id" <> "destination_account_id");
