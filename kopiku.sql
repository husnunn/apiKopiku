-- -------------------------------------------------------------
-- -------------------------------------------------------------
-- TablePlus 1.2.2
--
-- https://tableplus.com/
--
-- Database: mysql
-- Generation Time: 2025-01-28 06:04:50.226455
-- -------------------------------------------------------------

CREATE TABLE `harga` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `harga` varchar(255) NOT NULL,
  `ukuran` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `kecamatan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nama` varchar(50) NOT NULL,
  `id_kota` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `keranjang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_ukuran` bigint unsigned NOT NULL,
  `id_user` bigint unsigned NOT NULL,
  `kuantitas` int NOT NULL,
  `id_menu` varchar(255) NOT NULL,
  `id_outlet` int NOT NULL,
  `id_outlet_menu` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `kota` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nama` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `menu` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_menu` varchar(10) COLLATE utf8mb4_general_ci NOT NULL,
  `deskripsi` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `gambar` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `order` (
  `id` varchar(255) NOT NULL,
  `id_outlet_menu` bigint unsigned NOT NULL,
  `id_user` bigint unsigned NOT NULL,
  `kuantitas` int NOT NULL,
  `status` varchar(20) NOT NULL,
  `id_menu` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_ukuran` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `outlet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_outlet` varchar(11) COLLATE utf8mb4_general_ci NOT NULL,
  `id_kecamatan` int NOT NULL,
  `koordinat` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `outlet_menu` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_menu` int NOT NULL,
  `id_outlet` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `stok` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stok` int NOT NULL,
  `id_ukuran` int NOT NULL,
  `id_outlet_menu` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ukuran` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) NOT NULL,
  `id_menu` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `kopiku`.`harga` (`id`, `harga`, `ukuran`) VALUES 
(1, '15000', 1),
(2, '17000', 2),
(3, '12000', 3),
(4, '10000', 4),
(5, '11000', 5),
(6, '14000', 6),
(7, '6000', 7),
(8, '8000', 8),
(9, '10000', 9),
(10, '7000', 10),
(11, '9000', 11),
(12, '11000', 12);

INSERT INTO `kopiku`.`kecamatan` (`id`, `nama`, `id_kota`) VALUES 
(1, 'MEGALUH', '1'),
(2, 'PULO', '1'),
(3, 'RUNGKUT', '2');

INSERT INTO `kopiku`.`keranjang` (`id`, `id_ukuran`, `id_user`, `kuantitas`, `id_menu`, `id_outlet`, `id_outlet_menu`) VALUES (4, 1, 1, 10, '2', 1, 1);

INSERT INTO `kopiku`.`kota` (`id`, `nama`) VALUES 
(1, 'JOMBANG'),
(2, 'SURABAYA');

INSERT INTO `kopiku`.`menu` (`id`, `nama_menu`, `deskripsi`, `gambar`) VALUES 
(1, 'Cappucino', 'Kopi Cappucino', 'https://res.cloudinary.com/dppp7418y/image/upload/v1733305935/menu1_kxz2jq.jpg'),
(2, 'Latte', 'Kopi Latte', 'https://res.cloudinary.com/dppp7418y/image/upload/v1733306002/menu5_ikpqr7.jpg'),
(3, 'Kopi Hitam', 'Kopi Hitam', 'https://res.cloudinary.com/dppp7418y/image/upload/v1733306053/menu3_uuf7et.jpg'),
(4, 'Ekspresso', 'Kopi Expresso', 'https://res.cloudinary.com/dppp7418y/image/upload/v1733306068/menu4_eykc8n.jpg');

INSERT INTO `kopiku`.`order` (`id`, `id_outlet_menu`, `id_user`, `kuantitas`, `status`, `id_menu`, `created_at`, `id_ukuran`) VALUES 
('06179a1668d{sid}', 1, 1, 3, 'pending', '2', '2025-01-27 20:38:58', 1),
('5e520fdff00{sid}', 1, 1, 1, 'pending', '2', '2025-01-27 16:18:18', 1),
('706179a1668{sid}', 1, 1, 3, 'pending', '2', '2025-01-27 20:38:58', 1);

INSERT INTO `kopiku`.`outlet` (`id`, `nama_outlet`, `id_kecamatan`, `koordinat`) VALUES 
(1, 'Outlet 1', 1, '-7.5202947,112.2302516'),
(3, 'Outlet 2', 3, '-7.5495102127942575,112.38307750031153'),
(4, 'Outlet 4', 2, '-7.5495102127942575,112.38307750038787');

INSERT INTO `kopiku`.`outlet_menu` (`id`, `id_menu`, `id_outlet`) VALUES 
(1, 2, 1),
(3, 1, 3),
(4, 1, 4);

INSERT INTO `kopiku`.`stok` (`id`, `stok`, `id_ukuran`, `id_outlet_menu`) VALUES 
(1, 68, 1, 1),
(3, 1, 3, 3),
(4, 7, 3, 4);

INSERT INTO `kopiku`.`ukuran` (`id`, `nama`, `id_menu`) VALUES 
(1, 'S', 1),
(2, 'M', 1),
(3, 'L', 1),
(4, 'S', 2),
(5, 'M', 2),
(6, 'L', 2),
(7, 'S', 3),
(8, 'M', 3),
(9, 'L', 3),
(10, 'S', 4),
(11, 'M', 4),
(12, 'L', 4);

INSERT INTO `kopiku`.`user` (`id`, `username`, `password`, `email`) VALUES (1, 'tessso', '$2b$10$Jns/sy8Nl9.Db9KQY8aGS.5Fp0nzViG/albDkLkc26/iTz1DoH7i.', 'sudoaptu@gmail.com');

