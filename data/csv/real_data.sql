-- Supprimer les données existantes
DELETE FROM fixed_schedules;

-- Insérer les données réelles
INSERT INTO fixed_schedules (courseName, level, teacherName, day, time, duration, telegramGroup, zoomHostEmail, isActive, createdAt, updatedAt)
VALUES 
('Mina Lepsanovic - BBG - MW - 7:30pm', 'bbg', 'Mina Lepsanovic', 'monday', '20:30', 60, '-1001280305339', 'minalepsanovic@gmail.com', 1, 1746495375774, 1746495375774),
('Mina Lepsanovic - BBG - MW - 9:00pm', 'bbg', 'Mina Lepsanovic', 'monday', '22:00', 60, '-1001706969621', 'minalepsanovic@gmail.com', 1, 1746495375774, 1746495375774),
('Maimouna Koffi - ABG - MW - 8:30pm', 'abg', 'Maimouna Koffi', 'monday', '21:30', 60, '-1001189215986', 'keita_maimouna@ymail.com', 1, 1746495375774, 1746495375774),
('Maimouna Koffi - ABG - MW - 7:00pm', 'abg', 'Maimouna Koffi', 'monday', '20:00', 60, '-1001525896262', 'keita_maimouna@ymail.com', 1, 1746495375774, 1746495375774),
('Wissam Eddine - ABG - MW - 9:00pm', 'abg', 'Wissam Eddine', 'monday', '22:00', 60, '-1001200673710', 'wissamj8@hotmail.com', 1, 1746495375774, 1746495375774),
('Wissam Eddine - ABG - MW - 7:00pm', 'abg', 'Wissam Eddine', 'monday', '20:00', 60, '-1001450960271', 'wissamj8@hotmail.com', 1, 1746495375774, 1746495375774),
('Hafida Faraj - ABG - MW - 7:30pm', 'abg', 'Hafida Faraj', 'monday', '20:30', 60, '-1001674281614', 'hafidafaraj@gmail.com', 1, 1746495375774, 1746495375774),
('Hafida Faraj - ABG - MW - 9:00pm', 'abg', 'Hafida Faraj', 'monday', '22:00', 60, '-1001730425484', 'hafidafaraj@gmail.com', 1, 1746495375774, 1746495375774),
('Maryam Dannoun - ABG - MW - 8:00pm', 'abg', 'Maryam Dannoun', 'monday', '21:00', 60, '-1001183569832', 'missmiriamou@gmail.com', 1, 1746495375774, 1746495375774),
('Maryam Dannoun - ABG - MW - 7:00pm', 'abg', 'Maryam Dannoun', 'monday', '20:00', 60, '-1001539349411', 'missmiriamou@gmail.com', 1, 1746495375774, 1746495375774),
('Jahnvi Mahtani - IG - MW- 8:30pm', 'ig', 'Jahnvi Mahtani', 'monday', '21:30', 60, '-1001869970621', 'jahnvimahtani03@gmail.com', 1, 1746495375774, 1746495375774),
('Mina Lepsanovic - ABG - TT - 7:30pm', 'abg', 'Mina Lepsanovic', 'tuesday', '20:30', 60, '-1001668163742', 'minalepsanovic@gmail.com', 1, 1746495375774, 1746495375774),
('Mina Lepsanovic - ABG - TT - 9:00pm', 'abg', 'Mina Lepsanovic', 'tuesday', '22:00', 60, '-1001737172709', 'minalepsanovic@gmail.com', 1, 1746495375774, 1746495375774),
('Maimouna Koffi BBG - TT - 8:30pm', 'bbg', 'Maimouna Koffi', 'tuesday', '21:30', 60, '-1001159742178', 'keita_maimouna@ymail.com', 1, 1746495375774, 1746495375774),
('Maimouna Koffi - BBG - TT - 7:00pm', 'bbg', 'Maimouna Koffi', 'tuesday', '20:00', 60, '-1001605585045', 'keita_maimouna@ymail.com', 1, 1746495375774, 1746495375774),
('Aby Ndiaye - BBG - TT - 7:00pm', 'bbg', 'Aby Ndiaye', 'tuesday', '20:00', 60, '-1001685687091', 'sy_aby@yahoo.fr', 1, 1746495375774, 1746495375774),
('Wissam Eddine - BBG -TT - 7:00pm', 'bbg', 'Wissam Eddine', 'tuesday', '20:00', 60, '-1001268663743', 'wissamj8@hotmail.com', 1, 1746495375774, 1746495375774),
('Hafida Faraj - ABG - TT - 9:00pm', 'abg', 'Hafida Faraj', 'tuesday', '22:00', 60, '-1001160001497', 'hafidafaraj@gmail.com', 1, 1746495375774, 1746495375774),
('Maryam Dannoun - IG - TT - 7:00pm', 'ig', 'Maryam Dannoun', 'tuesday', '20:00', 60, '-1001272552537', 'missmiriamou@gmail.com', 1, 1746495375774, 1746495375774),
('Maryam Dannoun - ABG - TT - 8:00pm', 'abg', 'Maryam Dannoun', 'tuesday', '21:00', 60, '-1001247646684', 'missmiriamou@gmail.com', 1, 1746495375774, 1746495375774);
