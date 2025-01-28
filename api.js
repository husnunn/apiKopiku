require("dotenv").config();
express = require("express");
cors = require("cors");
bcrypt = require("bcrypt");
jwt = require("jsonwebtoken");
mysql = require("mysql2");
nodemailer = require("nodemailer");
midtransClient = require("midtrans-client");
const { uid } = require("uid");
app = express();

ACCESS_TOKEN_KEY = process.env.ACCESS_TOKEN_KEY;
REFRESH_TOKEN_KEY = process.env.REFRESH_TOKEN_KEY;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

db.connect((err) => {
  if (err) {
    console.error("Database  error:", err.message);
  }
});

transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.USER_MAIL,
    pass: process.env.PASS_MAIL,
  },
  logger: true,
  debug: true,
});

let verificationCode;
let expVerificationCode;

sendVerificationCode = async (toEmail, code) => {
  mail = {
    from: process.env.USER_MAIL,
    to: toEmail,
    subject: "Kode Verifikasi Anda",
    text: `Kode verifikasi Anda adalah ${code}`,
    html: `<p>Kode verifikasi Anda adalah: <strong>${code}</strong></p>`,
  };

  try {
    info = await transporter.sendMail(mail);
    console.log(info.response);
  } catch (error) {
    console.error(error.message);
  }
};

verifyAccessToken = (req, res, next) => {
  token = req.headers["authorization"];
  if (!token) return res.json({ message: "Token tidak boleh kosong" });

  try {
    decoded = jwt.verify(token, ACCESS_TOKEN_KEY);
    req.username = decoded.username;
    req.id = decoded.id;
    next();
  } catch (error) {
    if (error.message == "jwt expired") {
      return res.json({ message: "expired" });
    } else {
      return res.json({ error: error });
    }
  }
};

app.post("/sendcode", async (req, res) => {
  email = req.body.email;
  console.log(email);

  verificationCode = Math.floor(100000 + Math.random() * 900000);

  currentDate = new Date();
  expVerificationCode = currentDate.setMinutes(currentDate.getMinutes() + 1);

  await sendVerificationCode(email, verificationCode);
  res.json({ message: "Verifikasi kode dikirim" });
});

app.post("/sendcodeforforgot", (req, res) => {
  email = req.body.email;
  findEmailQuery = "SELECT * FROM user WHERE email = ?";
  db.query(findEmailQuery, [email], async (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: err });
    } else {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Email tidak ada" });
      }
    }
    verificationCode = Math.floor(100000 + Math.random() * 900000);
    expVerificationCode = new Date().setMinutes(new Date().getMinutes() + 1);

    await sendVerificationCode(email, verificationCode);
    res.json({ message: "Verifikasi kode dikirim" });
  });
});

app.post("/forgot", verifyAccessToken, async (req, res) => {
  const { email, password, code } = req.body;

  if (Date.now() >= expVerificationCode && code == verificationCode) {
    console.log("Code Expired");
    return res.status(400).json({ message: "Code Expired" });
  }

  if (code != verificationCode) {
    console.log("Code tidak valid");
    console.log(verificationCode);

    return res.status(400).json({ error: "Code tidak valid" });
  }

  hashedPassword = await bcrypt.hash(password, 10);
  updatePasswordQuery = "UPDATE user SET password = ? WHERE email = ?";

  db.query(updatePasswordQuery, [hashedPassword, email], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      console.log("Email tidak ada");
      return res.status(404).json({ message: "Email tidak ada" });
    }

    console.log("Ganti Password Berhasil");
    res.json({ message: "Ganti Password Berhasil" });
  });
});

// User Registration
app.post("/register", async (req, res) => {
  console.log(req.body);

  const { username, password, email, code } = req.body;

  if (Date.now() >= expVerificationCode && code == verificationCode) {
    console.log("Code expired");
    return res.json({ message: "Code expired" });
  }

  if (code != verificationCode) {
    console.log("Code tidak valid");
    return res.json({ message: "Code tidak valid" });
  }

  hashedPassword = await bcrypt.hash(password, 10);
  insertUserQuery = "INSERT INTO user SET ?";
  userData = { username, password: hashedPassword, email };

  db.query(insertUserQuery, userData, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        console.log("Username / email sudah ada");
        return res.json({ message: "Username /email sudah ada" });
      }
      return res.json({ error: err.message });
    }
    console.log("User berhasil di daftarkan");
    res.json({ message: "User berhasil di daftarkan" });
  });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  findUserQuery = "SELECT * FROM user WHERE username = ?";
  db.query(findUserQuery, [username], async (err, rows) => {
    if (err) return res.json({ error: err.message });

    if (rows.length === 0) {
      return res.json({ message: "User tidak ada" });
    }

    passwordMatch = await bcrypt.compare(password, rows[0].password);
    if (!passwordMatch) {
      return res.json({ message: "User atau password tidak valid" });
    }

    accessToken = jwt.sign(
      {
        username: username,
        id: rows[0].id,
      },
      ACCESS_TOKEN_KEY,
      {}
    );

    res.json({ message: "berhasil login", accessToken: accessToken });
  });
});

// Refresh Token
app.post("/refreshtoken", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.json("Token tidak boleh kosong");

  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_KEY);
    accessToken = jwt.sign({ username: decoded.username }, ACCESS_TOKEN_KEY, {
      expiresIn: "1m",
    });

    res.json({ accessToken });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/verify", verifyAccessToken, (req, res) => {
  res.json({ message: "Token valid", username: req.username });
});

app.get("/getmenu", verifyAccessToken, (req, res) => {
  db.query(
    `
    SELECT DISTINCT
  menu.id as id_menu,
  menu.nama_menu,
  menu.deskripsi,
  menu.gambar,
  MIN(harga.harga) as harga_terendah,
  MAX(harga.harga) as harga_tertinggi
from
  harga
  JOIN ukuran on ukuran.id = harga.ukuran
  join menu on ukuran.id_menu = menu.id
GROUP BY menu.id, menu.nama_menu, menu.deskripsi, menu.gambar;`,
    (err, rows) => {
      if (err) return res.json({ error: err });
      res.json({
        message: "berhasil",
        data: rows,
      });
    }
  );
});

app.get("/getmenu/detail", verifyAccessToken, async (req, res) => {
  id_menu = req.query.id_menu;
  if (!id_menu) return res.json({ error: "id_menu tidak boleh kosong" });
  data = {};
  db.query("select * from menu where id = ?", [id_menu], (err, rows) => {
    if (err) return res.json({ error: err.message });
    data.nama = rows[0].nama_menu;
    data.deskripsi = rows[0].deskripsi;
    data.gambar = rows[0].gambar;
    db.query(
      `SELECT harga ,ukuran.nama as ukuran, ukuran.id as id_ukuran,stok.stok
      FROM harga
      JOIN ukuran ON ukuran.id = harga.ukuran
      JOIN stok on ukuran.id = stok.id_ukuran
      JOIN outlet_menu ON stok.id_outlet_menu = outlet_menu.id
      WHERE outlet_menu.id_menu = ? and stok.stok > 0
      ORDER by harga;
      `,
      [id_menu],
      (err, rows) => {
        if (err) return res.json({ error: err.message });
        data.ukuran = {};
        rows.forEach((row) => {
          console.log(row);
          data.ukuran[row.id_ukuran] = {
            // id_ukuran: row.id_ukuran,
            ukuran: row.ukuran,
            harga: row.harga,
          };
        });
        data.kota = [];
        db.query(
          `SELECT DISTINCT kota.id, kota.nama AS nama_kota
           FROM kota
           JOIN kecamatan ON kecamatan.id_kota = kota.id
           JOIN outlet ON outlet.id_kecamatan = kecamatan.id
           JOIN outlet_menu ON outlet_menu.id_outlet = outlet.id
           JOIN stok ON stok.id_outlet_menu = outlet_menu.id
           WHERE stok.stok > 0 and outlet_menu.id_menu =  ?;
          `,
          [id_menu],
          (err, rows) => {
            if (err) return res.json({ error: err.message });
            rows.forEach((row) => {
              data.kota.push(row);
            });
            res.json({
              message: "berhasil",
              data: data,
            });
          }
        );
      }
    );
  });
});

app.get("/getukuran", verifyAccessToken, (req, res) => {
  id_menu = req.query.id_menu;
  id_outlet = req.query.id_outlet;

  if (!id_menu || !id_outlet) return res.json({ error: "id_menu dan id_outlet tidak boleh kosong" });
  db.query(
    `
    SELECT
  ukuran.nama as ukuran,
  ukuran.id as id_ukuran,
  stok.stok
    FROM
  ukuran
  JOIN stok on ukuran.id = stok.id_ukuran
  JOIN outlet_menu ON stok.id_outlet_menu = outlet_menu.id
    WHERE
  outlet_menu.id_menu = ?
  and stok.stok > 0
  and outlet_menu.id_outlet = ?`,
    [id_menu, id_outlet],
    (err, rows) => {
      if (err) return res.json({ error: err });
      if (rows.length < 1) return res.json({ error: "stok kosong" });
      res.json({
        message: "berhasil",
        data: rows,
      });
    }
  );
});

app.get("/getkecamatan", verifyAccessToken, (req, res) => {
  id_kota = req.query.id_kota;
  id_menu = req.query.id_menu;
  if (!id_kota || !id_menu) return res.json({ error: "id_kota dan id_menu tidak boleh kosong" });
  data = [];
  db.query(
    `SELECT DISTINCT
  kecamatan.id,
  kecamatan.nama
  FROM
  kecamatan
  JOIN outlet on outlet.id_kecamatan = kecamatan.id
  JOIN outlet_menu on outlet_menu.id_outlet = outlet.id and outlet_menu.id_menu = ?
  join stok on stok.id_outlet_menu = outlet_menu.id
  where
  id_kota = ? and stok.stok > 0`,
    [id_menu, id_kota],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      rows.forEach((row) => {
        data.push(row);
      });
      data.forEach((p) => {
        console.log(p.nama);
      });
      res.json({
        message: "berhasil",
        data: data,
      });
    }
  );
});

app.get("/getoutlet", verifyAccessToken, (req, res) => {
  id_kecamatan = req.query.id_kecamatan;
  if (!id_kecamatan) return res.json({ error: "id_kecamatan tidak boleh kosong" });
  data = [];
  db.query(
    `SELECT DISTINCT outlet.id as id_outlet,id_kecamatan,nama_outlet,koordinat FROM outlet
     join outlet_menu on outlet_menu.id_outlet = outlet.id
     where outlet.id_kecamatan = ?`,
    [id_kecamatan],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      rows.forEach((row, key) => {
        data.push(row);
      });
      if (data.length < 1) return res.json({ error: "outlet kosong" });
      res.json({
        message: "berhasil",
        data: data,
      });
    }
  );
});

app.get("/getstok", (req, res) => {
  id_outlet = req.query.id_outlet;
  id_menu = req.query.id_menu;
  id_ukuran = req.query.id_ukuran;
  if (!id_outlet || !id_menu || !id_ukuran)
    return res.json({
      error: "id_outlet, id_menu dan id_ukuran tidak boleh kosong",
    });
  db.query(
    `SELECT outlet_menu.id as id_outlet_menu
            FROM outlet
            JOIN outlet_menu on outlet.id = outlet_menu.id_outlet
            where outlet_menu.id_outlet = ? and outlet_menu.id_menu = ?`,
    [id_outlet, id_menu],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      id_outlet_menu = rows[0].id_outlet_menu;
      console.log(id_outlet_menu);
      db.query(
        `
      SELECT stok.id as id_stok,stok.stok
      from stok
      JOIN ukuran on stok.id_ukuran = ukuran.id
      JOIN outlet_menu on outlet_menu.id_menu = ukuran.id_menu and outlet_menu.id = stok.id_outlet_menu
      WHERE stok.id_outlet_menu =? and stok.id_ukuran = ?`,
        [id_outlet_menu, id_ukuran],
        (err, rows) => {
          if (err) return res.json({ error: err.message });
          console.log(rows);
          if (rows.length < 1) return res.json({ error: "stok kosong" });
          res.json({
            message: "berhasil",
            data: rows,
          });
        }
      );
    }
  );
});

const inputOrder = (datas, id_user, req, res) => {
  for (data of datas) {
    kuantitas = data.kuantitas;
    id_outlet = data.id_outlet;
    harga = data.harga;
    id_menu = data.id_menu;
    nama = data.nama_menu;
    id_ukuran = data.id_ukuran;

    if (!kuantitas || !id_outlet || !harga || !id_menu)
      return res.json({
        error: " kuantitas, id_outlet, harga dan id_menu tidak boleh kosong",
      });
    total = parseInt(kuantitas) * parseInt(harga);
    db.query(
      `
        SELECT outlet.id,nama_outlet,koordinat,outlet_menu.id as id_outlet_menu
        FROM outlet
        join outlet_menu on outlet_menu.id_outlet = outlet.id
        where outlet.id = ?`,
      [id_outlet],
      (err, rows) => {
        if (err) return res.json({ error: err.message });
        if (rows.length < 1 || !rows[0].id) return res.json({ message: "id_outlet_menu kosong" });
        id_outlet_menu = rows[0].id;
        order_uid = uid() + "{sid}";
        db.query("insert into `order` (id,id_outlet_menu,id_user,kuantitas,status,id_menu,id_ukuran) values (?,?,?,?,?,?,?)", [order_uid, id_outlet_menu, id_user, kuantitas, "pending", id_menu, id_ukuran], async (err, rows) => {
          console.log(id_menu);
          if (err) return res.json({ error: err.message });
          console.log(total);

          try {
            parameter = {
              transaction_details: {
                order_id: order_uid,
                gross_amount: total,
              },
              item_details: {
                quantity: kuantitas,
                name: nama,
                price: harga,
              },
            };
            snapToken = await snap.createTransaction(parameter);
            console.log(order_uid);

            res.json({ message: "berhasil", snap_token: snapToken });
          } catch (err) {
            console.log(err);
          }
        });
      }
    );
  }
};

app.post("/inputorder", verifyAccessToken, (req, res) => {
  datas = req.body;
  id_user = req.id;

  inputOrder(datas, id_user, req, res);
});

app.post("/midtrans/callback", (req, res) => {
  const notification = req.body;
  console.log("Notification received:", notification);
  const { transaction_status, order_id, fraud_status } = notification;

  if (transaction_status === "capture" && fraud_status === "accept") {
    console.log(`Payment for Order ID: ${order_id} succeeded.`);
  } else if (transaction_status === "settlement") {
    db.query("update `order` set `status` = 'success' where id = ?", [order_id], (err, rows) => {
      if (err) console.log(err);
      db.query("select id_outlet_menu,kuantitas from `order` where id = ?", [order_id], (err, rows) => {
        if (err) console.log(err);
        kuantitas = rows[0].kuantitas;
        id_outlet_menu = rows[0].id_outlet_menu;
        db.query("update `stok` set `stok` = stok - ?  where id_outlet_menu = ?", [1, id_outlet_menu], (err, rows) => {
          if (err) console.log(err);
        });
      });
      console.log(`Order ID: ${order_id} has been settled.`);
    });
  } else if (transaction_status === "cancel" || transaction_status === "expire") {
    db.query("delete from `order` where id = ?", [order_id], (err, rows) => {
      if (err) console.log(err);
    });
    console.log(`Payment for Order ID: ${order_id} failed.`);
  }
  res.status(200).send("OK");
});

app.post("/callback", (req, res) => {
  body = req.body;
  user_id = body.user_id;

  db.query(
    `
     SELECT \`order\`.id
     FROM \`order\`
     WHERE id_user = ?
     ORDER BY created_at DESC
    LIMIT 1 ;
`,
    [user_id],
    (err, rows) => {
      if (err) return res.json("kuery get order id gagal");
      order_id = rows[0].id;
      db.query("update `order` set `status` = 'success' where id = ?", [order_id], (err, rows) => {
        if (err) console.log(err);
        db.query("select id_outlet_menu,kuantitas from `order` where id = ?", [order_id], (err, rows) => {
          if (err) console.log(err);
          kuantitas = rows[0].kuantitas;
          id_outlet_menu = rows[0].id_outlet_menu;
          db.query("update `stok` set `stok` = stok - ?  where id_outlet_menu = ?", [1, id_outlet_menu], (err, rows) => {
            if (err) return res.json(err);
            res.status(200).send("OK");
          });
        });
        console.log(`Order ID: ${order_id} has been settled.`);
      });
    }
  );
});

app.get("/getriwayat", verifyAccessToken, (req, res) => {
  id_user = req.id;
  if (!id_user) return res.json({ error: "id_user tidak boleh kosong" });
  db.query(
    `
     SELECT order.kuantitas,order.status,menu.nama_menu,menu.gambar,outlet.nama_outlet,outlet.koordinat,kota.nama as nama_kota,kecamatan.nama as nama_kecamatan FROM \`order\`
     JOIN outlet_menu on outlet_menu.id = order.id_outlet_menu
     JOIN menu on order.id_menu = menu.id
     join outlet on outlet.id = outlet_menu.id_outlet
     join kecamatan on kecamatan.id = outlet.id_kecamatan
     join kota on kota.id = kecamatan.id_kota
     WHERE id_user = ?`,
    [id_user],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      if (rows.length < 1) return res.json({ error: "riwayat kosong" });
      res.json({
        message: "berhasil",
        data: rows,
      });
    }
  );
});

app.post("/keranjang", verifyAccessToken, (req, res) => {
  id_user = req.id;
  id_outlet = req.body.id_outlet;
  id_menu = req.body.id_menu;
  id_ukuran = req.body.id_ukuran;
  kuantitas = req.body.kuantitas;
  console.log(id_user, id_outlet, id_menu, id_ukuran, kuantitas);
  if (!id_outlet || !id_menu || !id_ukuran || !kuantitas)
    return res.json({
      error: "id_user, id_outlet, id_menu, id_ukuran dan kuantitas tidak boleh kosong",
    });
  db.query(
    `
    SELECT outlet_menu.id as id_outlet_menu
    FROM outlet
    JOIN outlet_menu on outlet_menu.id_outlet = outlet.id
    where outlet.id = ? and outlet_menu.id_menu = ?`,
    [id_outlet, id_menu],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      if (rows.length < 1 || !rows[0].id_outlet_menu) return res.json({ message: "id_outlet_menu kosong" });
      id_outlet_menu = rows[0].id_outlet_menu;
      db.query("insert into keranjang (id_user,id_outlet,id_ukuran,kuantitas,id_menu,id_outlet_menu) values (?,?,?,?,?,?)", [id_user, id_outlet, id_ukuran, kuantitas, id_menu, id_outlet_menu], (err, rows) => {
        if (err) return res.json({ error: err.message });
        res.json({ message: "berhasil" });
      });
    }
  );
});

app.get("/keranjang", verifyAccessToken, (req, res) => {
  id_user = req.id;
  if (!id_user) return res.json({ error: "id_user tidak boleh kosong" });
  db.query(
    `
     SELECT keranjang.id,keranjang.kuantitas,harga.harga,ukuran.nama,menu.nama_menu,menu.gambar,outlet.nama_outlet,outlet.koordinat,kota.nama as nama_kota,kecamatan.nama as nama_kecamatan FROM \`keranjang\`
     JOIN outlet_menu on outlet_menu.id = keranjang.id_outlet_menu
     JOIN menu on keranjang.id_menu = menu.id
     join outlet on outlet.id = outlet_menu.id_outlet
     join kecamatan on kecamatan.id = outlet.id_kecamatan
     join kota on kota.id = kecamatan.id_kota
     join harga on harga.ukuran = keranjang.id_ukuran
      join ukuran on ukuran.id = keranjang.id_ukuran
     WHERE id_user = ?`,
    [id_user],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      if (rows.length < 1) return res.json({ error: "keranjang kosong" });
      const result = rows.map((row) => {
        return {
          ...row,
          harga_total: parseInt(row.harga) * parseInt(row.kuantitas),
        };
      });
      res.json({
        message: "berhasil",
        data: result,
      });
    }
  );
});

app.delete("/keranjang", verifyAccessToken, (req, res) => {
  id_user = req.id;

  id_keranjang = req.body.id_keranjang;
  if (!id_user || !id_keranjang) return res.json({ error: "id_user dan id_keranjang tidak boleh kosong" });
  db.query(
    `
    DELETE FROM keranjang WHERE id = ? `,
    [id_keranjang, id_user],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      res.json({
        message: "berhasil delete keranjang",
      });
    }
  );
});

app.get("/keranjangbyid", verifyAccessToken, (req, res) => {
  id_user = req.id;

  id_keranjang = req.query.id_keranjang;
  id_user = req.id;
  if (!id_user || !id_keranjang) return res.json({ error: "id_user dan id_keranjang tidak boleh kosong" });
  db.query(
    `
     SELECT keranjang.id,keranjang.kuantitas,menu.nama_menu,menu.gambar,outlet.nama_outlet,outlet.koordinat,kota.nama as nama_kota,kecamatan.nama as nama_kecamatan FROM \`keranjang\`
     JOIN outlet_menu on outlet_menu.id = keranjang.id_outlet_menu
     JOIN menu on keranjang.id_menu = menu.id
     join outlet on outlet.id = outlet_menu.id_outlet
     join kecamatan on kecamatan.id = outlet.id_kecamatan
     join kota on kota.id = kecamatan.id_kota
     WHERE  keranjang.id = ?`,
    [id_keranjang],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      if (rows.length < 1) return res.json({ error: "keranjang kosong" });
      res.json({
        message: "berhasil",
        data: rows,
      });
    }
  );
});

app.patch("/keranjang", verifyAccessToken, (req, res) => {
  id_user = req.id;

  id_keranjang = req.body.id_keranjang;
  kuantitas = req.body.kuantitas;
  if (!id_keranjang || !kuantitas)
    return res.json({
      error: "id_user,kuantitas dan id_keranjang  tidak boleh kosong",
    });
  db.query(
    `
    UPDATE keranjang SET kuantitas = ? WHERE id = ? `,
    [kuantitas, id_keranjang],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      res.json({
        message: "berhasil update kuantitas keranjang",
      });
    }
  );
});

app.patch("/user", verifyAccessToken, (req, res) => {
  id_user = req.id;
  username = req.body.username;
  if (!id_user || !username)
    return res.json({
      error: "id_user,username tidak boleh kosong",
    });
  db.query(
    `
    UPDATE user SET username = ? WHERE id = ? `,
    [username, id_user],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      res.json({
        message: "berhasil update username ",
      });
    }
  );
});

app.get("/user", verifyAccessToken, (req, res) => {
  id_user = req.id;
  if (!id_user)
    return res.json({
      error: "id_user tidak boleh kosong",
    });
  db.query(
    `
    select username,email,id from user WHERE id = ? `,
    [id_user],
    (err, rows) => {
      if (err) return res.json({ error: err.message });
      res.json({
        message: "berhasil mendapatkan data user ",
        data: rows,
      });
    }
  );
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
