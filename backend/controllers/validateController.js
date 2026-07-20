
const fs = require("fs");
const path = require("path");
const pkcs7 = require("pkcs7");

exports.validateSignature = (req, res) => {
  const { fileId, signatureFile } = req.body;

  const filePath = path.join(__dirname, "../uploads", fileId);
  const sigPath = path.join(__dirname, "../uploads", signatureFile);

  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");
  if (!fs.existsSync(sigPath)) return res.status(404).send("Signature not found");

  try {
    const signedData = fs.readFileSync(sigPath);
    const p7 = pkcs7.parse(signedData);
    const valid = p7.verify();

    res.json({
      status: valid ? "valid" : "invalid",
      signer: p7.signers.map(s => s.issuerName).join(", "),
      hash: p7.hashAlgorithm,
      fileType: path.extname(filePath).toLowerCase()
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
};
