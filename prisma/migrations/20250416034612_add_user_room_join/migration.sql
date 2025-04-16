-- CreateTable
CREATE TABLE "UserRoomJoin" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoomJoin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRoomJoin_userId_roomId_idx" ON "UserRoomJoin"("userId", "roomId");

-- AddForeignKey
ALTER TABLE "UserRoomJoin" ADD CONSTRAINT "UserRoomJoin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoomJoin" ADD CONSTRAINT "UserRoomJoin_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
