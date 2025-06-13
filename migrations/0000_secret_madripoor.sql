CREATE TABLE "lists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"archivedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"archivedAt" timestamp,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"listId" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_listId_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."lists"("id") ON DELETE no action ON UPDATE no action;