-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: secure_app
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,5,'LOGIN_SUCCESS','::1','PostmanRuntime/7.52.0','2026-03-29 18:41:00'),(2,5,'LOGIN_FAILED','::1','PostmanRuntime/7.52.0','2026-03-29 18:42:12'),(3,5,'PASSWORD_RESET_REQUESTED','::1','PostmanRuntime/7.52.0','2026-03-29 19:18:20'),(4,5,'PASSWORD_RESET_SUCCESS','::1','PostmanRuntime/7.52.0','2026-03-29 19:21:45');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_name` varchar(255) NOT NULL,
  `description` text,
  `priority` enum('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `status` enum('To-Do','In-Progress','Completed') NOT NULL DEFAULT 'To-Do',
  `start_datetime` datetime DEFAULT NULL,
  `end_datetime` datetime DEFAULT NULL,
  `assignee_id` int NOT NULL,
  `assigned_to_id` int NOT NULL,
  `created_by_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tasks_assignee` (`assignee_id`),
  KEY `fk_tasks_assigned_to` (`assigned_to_id`),
  KEY `fk_tasks_creator` (`created_by_user_id`),
  CONSTRAINT `fk_tasks_assigned_to` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,'Backend aligned task','Testing frontend-compatible task body','Medium','To-Do','2026-03-28 06:00:00','2026-03-28 07:00:00',1,1,4,'2026-03-29 15:18:02','2026-03-29 15:18:02');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `uploaded_files`
--

DROP TABLE IF EXISTS `uploaded_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uploaded_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `uploaded_by` int NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` int NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_uploaded_files_task` (`task_id`),
  KEY `fk_uploaded_files_user` (`uploaded_by`),
  CONSTRAINT `fk_uploaded_files_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uploaded_files_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `uploaded_files`
--

LOCK TABLES `uploaded_files` WRITE;
/*!40000 ALTER TABLE `uploaded_files` DISABLE KEYS */;
INSERT INTO `uploaded_files` VALUES (1,1,1,'Final-assignment (2).pdf','1774797816795-Final-assignment_(2).pdf','application/pdf',356553,'storage\\uploads\\1774797816795-Final-assignment_(2).pdf','2026-03-29 15:23:36');
/*!40000 ALTER TABLE `uploaded_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_strength` enum('WEAK','MEDIUM','STRONG') NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `failed_attempts` int DEFAULT '0',
  `consecutive_failed_attempts` int DEFAULT '0',
  `last_failed_attempt_at` datetime DEFAULT NULL,
  `first_failed_attempt_at` datetime DEFAULT NULL,
  `lock_until` datetime DEFAULT NULL,
  `lock_level` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reset_password_token_hash` varchar(255) DEFAULT NULL,
  `reset_password_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Oluchi','Odigili','test1@gmail.com','$2b$10$1gArEdGv5v8P8qB8Z7iQa.5J1laHsAC4YQspGUbthXMvRzT1P2akm','STRONG','user',1,1,'2026-03-29 12:32:21','2026-03-29 12:32:21',NULL,0,'2026-03-28 08:42:48','2026-03-29 15:32:20',NULL,NULL),(2,'Oluchi','Odigili','test231@gmail.com','$2b$10$BfPd2J4/xZgRUI8NNuwtjuoqmw.FTTY7oLtHmxoY.HnOwUWh2PWSK','STRONG','user',0,0,NULL,NULL,NULL,0,'2026-03-29 00:20:15','2026-03-29 00:20:15',NULL,NULL),(3,'Oluchi','Odigili','test81@gmail.com','$2b$10$acg9rBQiWfzfSrHKEZ/mk./4UJCSFudJMk4jqtOZgEhUo2dZzFqVW','STRONG','user',0,0,NULL,NULL,NULL,0,'2026-03-29 10:14:29','2026-03-29 10:14:29',NULL,NULL),(4,'first','test','test@gmail.com','$2b$10$AMSbBQ1LSJXtkKF/7Z/yMu2S5VPWoJ45HGehG2NR7E.tq4Ue2jeyO','MEDIUM','user',0,0,NULL,NULL,NULL,0,'2026-03-29 15:01:12','2026-03-29 15:01:12',NULL,NULL),(5,'Oluchi','Test','oluchi.test1@example.com','$2b$10$8OfTbkBWU/nRM7Pg6qpwd.wozhaaPadBJzSngzC4NEShG9JM78RTO','STRONG','user',1,1,'2026-03-29 15:42:13','2026-03-29 15:42:13',NULL,0,'2026-03-29 16:46:58','2026-03-29 19:21:45',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'secure_app'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-29 16:44:12
