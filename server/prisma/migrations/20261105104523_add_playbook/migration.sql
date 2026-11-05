-- CreateEnum
CREATE TYPE "Trigger" AS ENUM ('MALWARE_DETECTED', 'LOGIN_ATTEMPT', 'PHISHING_ALERT');

-- CreateEnum
CREATE TYPE "Action" AS ENUM ('ISOLATE_HOST', 'NOTIFY_ADMIN', 'BLOCK_IP');

-- CreateTable
CREATE TABLE "Playbook" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "trigger" "Trigger" NOT NULL,
    "actions" "Action"[],
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Playbook_userId_trigger_idx" ON "Playbook"("userId", "trigger");

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
