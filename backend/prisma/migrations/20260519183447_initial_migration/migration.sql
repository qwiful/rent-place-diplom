-- CreateEnum
CREATE TYPE "viewing_request_status" AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "contract_status_enum" AS ENUM ('draft', 'pending', 'active', 'terminated', 'completed');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "interaction_type_enum" AS ENUM ('phone', 'email', 'meeting', 'note');

-- CreateEnum
CREATE TYPE "priority_enum" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "rental_status_enum" AS ENUM ('available', 'occupied', 'reserved', 'under_renovation');

-- CreateEnum
CREATE TYPE "service_type_enum" AS ENUM ('cleaning', 'repair', 'technical', 'other');

-- CreateEnum
CREATE TYPE "ticket_status_enum" AS ENUM ('new', 'in_progress', 'on_hold', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "old_values" JSON,
    "new_values" JSON,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_centers" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_status_history" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "old_status" VARCHAR(50),
    "new_status" VARCHAR(50) NOT NULL,
    "changed_by_user_id" INTEGER NOT NULL,
    "change_reason" TEXT,
    "change_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "contract_number" VARCHAR(100) NOT NULL,
    "rental_object_id" INTEGER NOT NULL,
    "tenant_user_id" INTEGER,
    "tenant_organization_id" INTEGER,
    "landlord_organization_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "deposit" DECIMAL(12,2) DEFAULT 0,
    "payment_day" INTEGER,
    "contract_file_url" TEXT,
    "signed_at" TIMESTAMP(6),
    "status" "contract_status_enum" DEFAULT 'draft',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "type" "interaction_type_enum" NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(255),
    "inn" VARCHAR(12) NOT NULL,
    "kpp" VARCHAR(9),
    "ogrn" VARCHAR(15),
    "legal_address" TEXT,
    "actual_address" TEXT,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_objects" (
    "id" SERIAL NOT NULL,
    "business_center_id" INTEGER NOT NULL,
    "manager_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "area" DECIMAL(10,2) NOT NULL,
    "price_per_month" DECIMAL(12,2) NOT NULL,
    "status" "rental_status_enum" DEFAULT 'available',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "photos" JSONB DEFAULT '[]',

    CONSTRAINT "rental_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tickets" (
    "id" SERIAL NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "assigned_manager_id" INTEGER,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" "service_type_enum" NOT NULL DEFAULT 'other',
    "completion_date" TIMESTAMP(6),
    "status" "ticket_status_enum" DEFAULT 'new',
    "priority" "priority_enum" DEFAULT 'medium',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_status_history" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "old_status" VARCHAR(50),
    "new_status" VARCHAR(50) NOT NULL,
    "changed_by_user_id" INTEGER NOT NULL,
    "change_reason" TEXT,
    "change_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "gender" "gender_enum",
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "organization_id" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_requests" (
    "id" SERIAL NOT NULL,
    "rental_object_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "preferred_date" DATE NOT NULL,
    "preferred_time" VARCHAR(10) NOT NULL,
    "status" "viewing_request_status" NOT NULL DEFAULT 'pending',
    "scheduled_date" DATE,
    "scheduled_time" VARCHAR(10),
    "user_notes" TEXT,
    "manager_notes" TEXT,
    "processed_by" INTEGER,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_contract_status_history_contract" ON "contract_status_history"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "idx_contracts_dates" ON "contracts"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_contracts_status" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "idx_interactions_contract" ON "interactions"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_inn_key" ON "organizations"("inn");

-- CreateIndex
CREATE INDEX "idx_rental_objects_price" ON "rental_objects"("price_per_month");

-- CreateIndex
CREATE INDEX "idx_rental_objects_status" ON "rental_objects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "idx_service_tickets_priority" ON "service_tickets"("priority");

-- CreateIndex
CREATE INDEX "idx_service_tickets_status" ON "service_tickets"("status");

-- CreateIndex
CREATE INDEX "idx_ticket_status_history_ticket" ON "ticket_status_history"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "viewing_requests_rental_object_id_idx" ON "viewing_requests"("rental_object_id");

-- CreateIndex
CREATE INDEX "viewing_requests_user_id_idx" ON "viewing_requests"("user_id");

-- CreateIndex
CREATE INDEX "viewing_requests_status_idx" ON "viewing_requests"("status");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_centers" ADD CONSTRAINT "business_centers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_status_history" ADD CONSTRAINT "contract_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_status_history" ADD CONSTRAINT "contract_status_history_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_landlord_organization_id_fkey" FOREIGN KEY ("landlord_organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_rental_object_id_fkey" FOREIGN KEY ("rental_object_id") REFERENCES "rental_objects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_organization_id_fkey" FOREIGN KEY ("tenant_organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_objects" ADD CONSTRAINT "rental_objects_business_center_id_fkey" FOREIGN KEY ("business_center_id") REFERENCES "business_centers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rental_objects" ADD CONSTRAINT "rental_objects_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_assigned_manager_id_fkey" FOREIGN KEY ("assigned_manager_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_rental_object_id_fkey" FOREIGN KEY ("rental_object_id") REFERENCES "rental_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
