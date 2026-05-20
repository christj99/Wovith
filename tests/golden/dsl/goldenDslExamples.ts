export const validGoldenDslExamples = [
  `from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list`,
  `from synthetic.mail.threads
where unread is false
sort by received_at desc
take 10
show as table`,
  `from synthetic.mail.threads
where important is true
sort by received_at desc
take 5
show as list`,
  `from synthetic.mail.threads
where sender contains "example"
sort by received_at desc
take 20
show as list`,
  `from synthetic.mail.threads
where project is "Atlas"
where unread is true
sort by received_at desc
take 10
show as list`,
  `from synthetic.mail.threads
where has_attachment is true
sort by received_at desc
take 10
show as table`,
  `from synthetic.mail.threads
where labels contains "newsletter"
sort by received_at desc
take 5
show as raw`,
  `from synthetic.mail.threads
where received_at before now()
sort by received_at desc
take 50
show as count`,
  `from synthetic.mail.threads
where received_at on or after days_ago(14)
sort by received_at asc
take 20
show as list`,
  `from synthetic.mail.threads
where subject contains "Atlas"
sort by received_at desc
take 20
show as list`,
  `from synthetic.mail.threads
where preview contains "launch"
sort by received_at desc
take 10
show as list`,
  `from synthetic.mail.threads
where project is not "Reading"
sort by received_at desc
take 25
show as table`,
  `from synthetic.calendar.events
where start after now()
sort by start asc
take 5
show as table`,
  `from synthetic.calendar.events
where project is "Atlas"
sort by start asc
take 10
show as list`,
  `from synthetic.calendar.events
where attendees greater than 3
sort by start asc
take 10
show as table`,
  `from synthetic.calendar.events
where attendees less than 5
sort by start asc
take 10
show as list`,
  `from synthetic.calendar.events
where location is "Video"
sort by start asc
take 10
show as table`,
  `from synthetic.calendar.events
where description contains "Review"
sort by start asc
take 10
show as list`,
  `from synthetic.calendar.events
where start before in_days(7)
sort by start asc
take 10
show as table`,
  `from synthetic.calendar.events
where start on or after today()
sort by start asc
take 10
show as list`,
  `from synthetic.calendar.events
where end on or before in_days(3)
sort by end asc
take 10
show as raw`,
  `from synthetic.calendar.events
where related_doc_id is "drive-001"
sort by start asc
take 5
show as table`,
  `from synthetic.drive.files
where modified_at after days_ago(7)
sort by modified_at desc
take 10
show as list`,
  `from synthetic.drive.files
where stale is true
sort by modified_at asc
take 10
show as table`,
  `from synthetic.drive.files
where stale is false
sort by modified_at desc
take 10
show as list`,
  `from synthetic.drive.files
where project is "Support"
sort by modified_at desc
take 10
show as list`,
  `from synthetic.drive.files
where owner is "Mira"
sort by modified_at desc
take 10
show as table`,
  `from synthetic.drive.files
where mime_type contains "document"
sort by modified_at desc
take 10
show as raw`,
  `from synthetic.drive.files
where name contains "plan"
sort by modified_at desc
take 10
show as list`,
  `from synthetic.drive.files
where modified_at before days_ago(14)
sort by modified_at asc
take 10
show as list`,
  `from synthetic.drive.files
where url contains "drive"
sort by modified_at desc
take 10
show as table`,
  `from synthetic.drive.files
where project is not "People"
sort by modified_at desc
take 10
show as list`,
  `from synthetic.tasks
where completed is false
where due_at on or before in_days(3)
sort by due_at asc
take 20
show as count`,
  `from synthetic.tasks
where completed is false
sort by due_at asc
take 20
show as list`,
  `from synthetic.tasks
where completed is true
sort by updated_at desc
take 10
show as table`,
  `from synthetic.tasks
where priority is "high"
sort by due_at asc
take 10
show as list`,
  `from synthetic.tasks
where project is "Support"
sort by due_at asc
take 10
show as list`,
  `from synthetic.tasks
where title contains "notes"
sort by updated_at desc
take 10
show as raw`,
  `from synthetic.tasks
where updated_at before days_ago(10)
sort by updated_at asc
take 10
show as table`,
  `from synthetic.tasks
where due_at after today()
sort by due_at asc
take 20
show as list`,
  `from synthetic.tasks
where due_at on or after today()
sort by due_at asc
take 20
show as list`,
  `from synthetic.tasks
where priority is not "low"
sort by due_at asc
take 20
show as table`,
  `from synthetic.mail.threads
where unread is true
take 3
show as count`,
  `from synthetic.calendar.events
where attendees greater than 1
take 3
show as count`,
  `from synthetic.drive.files
where stale is false
take 3
show as count`,
  `from synthetic.tasks
where completed is false
take 3
show as count`,
  `from synthetic.mail.threads
where project contains "At"
sort by received_at desc
take 5
show as raw`,
  `from synthetic.calendar.events
where title contains "review"
sort by start asc
take 5
show as raw`,
  `from synthetic.drive.files
where owner contains "i"
sort by modified_at desc
take 5
show as raw`,
  `from synthetic.tasks
where project contains "t"
sort by updated_at desc
take 5
show as raw`,
  `from synthetic.mail.threads
where received_at on or before now()
sort by received_at desc
take 20
show as table`,
  `from synthetic.tasks
where due_at before in_days(10)
sort by due_at asc
take 20
show as table`,
];

export const invalidGoldenDslExamples = [
  `from synthetic.mail.threads
where unread == true
show as list`,
  `from synthetic.mail.threads
first 10
show as list`,
  `from synthetic.mail.threads
where unread is maybe
show as list`,
  `from synthetic.mail.threads
where received_at after yesterday()
show as list`,
];
