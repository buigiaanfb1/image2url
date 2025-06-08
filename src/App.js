import { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Grid,
  Typography,
  Button,
  Stack,
  Link,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  Fade,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useColorMode } from "./AppThemeProvider";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import heic2any from "heic2any";
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

function App() {
  const [images, setImages] = useState([]); // Files to upload
  const [uploaded, setUploaded] = useState([]); // Uploaded URLs + copied state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const dropRef = useRef();

  // Cleanup object URLs when images change or component unmounts
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  // Paste images from clipboard (accept all image types)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      const files = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        processFiles(files);
        showToast("Đã dán ảnh từ clipboard");
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Drag & Drop handler (accept PNG, JPEG, HEIC)
  useEffect(() => {
    const dropArea = dropRef.current;
    if (!dropArea) return;

    const handleDrop = (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ["image/jpeg", "image/png", "image/heic", "image/heif"].includes(
          file.type
        )
      );
      processFiles(files);
    };
    const handleDragOver = (e) => e.preventDefault();

    dropArea.addEventListener("drop", handleDrop);
    dropArea.addEventListener("dragover", handleDragOver);

    return () => {
      dropArea.removeEventListener("drop", handleDrop);
      dropArea.removeEventListener("dragover", handleDragOver);
    };
  }, []);

  // Convert HEIC to JPEG if needed, add preview URLs, then add to images
  const processFiles = useCallback(async (files) => {
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        if (file.type === "image/heic" || file.type === "image/heif") {
          try {
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
            });
            return new File(
              [convertedBlob],
              file.name.replace(/\.(heic|heif)$/i, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: Date.now(),
                preview: URL.createObjectURL(convertedBlob),
              }
            );
          } catch (err) {
            console.error("HEIC conversion failed", err);
            return null;
          }
        } else {
          // Add preview URL property for all other images
          file.preview = URL.createObjectURL(file);
          return file;
        }
      })
    );

    // Filter out null results in case conversion failed
    const validFiles = processedFiles.filter(Boolean);

    setImages((prev) => [...prev, ...validFiles]);
  }, []);

  // Handle manual file input selection
  const onFileChange = (e) => {
    const valid = Array.from(e.target.files).filter((file) =>
      ["image/png", "image/jpeg", "image/heic", "image/heif"].includes(
        file.type
      )
    );
    processFiles(valid);
  };

  // Upload images to Firebase Storage
  const uploadImages = async () => {
    if (!images.length) {
      showToast("Vui lòng chọn ảnh");
      return;
    }
    setUploading(true);
    const newUploads = [];

    for (const image of images) {
      try {
        const imageRef = ref(storage, `faces/${uuidv4()}`);
        await uploadBytes(imageRef, image);
        const downloadUrl = await getDownloadURL(imageRef);
        newUploads.push({ url: downloadUrl, copied: false });
      } catch (error) {
        console.error("Upload failed", error);
        showToast("Tải lên thất bại, thử lại sau");
        setUploading(false);
        return;
      }
    }

    setUploaded((prev) => [...newUploads, ...prev]);
    showToast("Tải lên thành công!");
    // Revoke preview URLs after upload
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setUploading(false);
  };

  // Copy uploaded URL to clipboard with feedback
  const copyToClipboard = (index) => {
    navigator.clipboard.writeText(uploaded[index].url).then(() => {
      setUploaded((prev) =>
        prev.map((item, i) => (i === index ? { ...item, copied: true } : item))
      );
      showToast("Đã sao chép đường dẫn!");
      setTimeout(() => {
        setUploaded((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, copied: false } : item
          )
        );
      }, 2000);
    });
  };

  const removeImage = (indexToRemove) => {
    // Revoke URL object to avoid memory leak
    URL.revokeObjectURL(images[indexToRemove].preview);
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const clearAllImages = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastOpen(true);
  };

  return (
    <Box
      ref={dropRef}
      sx={{
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(to right, #1e1e1e, #2d2d2d)"
            : "linear-gradient(to right, #667eea, #764ba2)",
        py: 6,
        px: 2,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        position: "relative",
      }}
    >
      <Box position="absolute" top={16} right={16}>
        <Tooltip title="Đổi giao diện">
          <IconButton onClick={toggleColorMode} color="inherit">
            {theme.palette.mode === "dark" ? (
              <LightModeIcon />
            ) : (
              <DarkModeIcon />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Container
        maxWidth="md"
        sx={(theme) => ({
          borderRadius: 4,
          boxShadow: 6,
          p: { xs: 3, sm: 4 },
          bgcolor: theme.palette.mode === "dark" ? "#333" : "#fff",
          color: theme.palette.mode === "dark" ? "#eee" : "#111",
        })}
      >
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          Ảnh thành viên
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="center"
          mb={4}
        >
          <Button variant="contained" component="label" sx={{ px: 4, py: 1.5 }}>
            Chọn ảnh
            <input
              hidden
              type="file"
              multiple
              accept="image/png, image/jpeg, image/heic, image/heif"
              onChange={onFileChange}
            />
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={uploadImages}
            disabled={uploading || !images.length}
            sx={{ px: 5, py: 1.5, position: "relative" }}
          >
            {uploading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Tải ảnh"
            )}
          </Button>

          {images.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={clearAllImages}
              sx={{ px: 3, py: 1.5 }}
            >
              Xóa tất cả
            </Button>
          )}
        </Stack>

        {images.length > 0 && (
          <>
            <Typography align="center" mb={2}>
              {images.length} ảnh đã chọn
            </Typography>
            <Stack direction="row" spacing={2} mb={4} flexWrap="wrap">
              {images.map((img, i) => (
                <Box key={i} position="relative">
                  <Card sx={{ width: 150, borderRadius: 2, boxShadow: 3 }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={img.preview}
                      alt={`Preview ${i}`}
                      sx={{ objectFit: "cover" }}
                    />
                  </Card>
                  <IconButton
                    onClick={() => removeImage(i)}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      bgcolor: "rgba(255,255,255,0.7)",
                      "&:hover": { bgcolor: "rgba(255,255,255,1)" },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {uploaded.length > 0 && (
          <>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ mb: 3, fontWeight: 600 }}
            >
              Ảnh đã lưu
            </Typography>
            <Grid container spacing={3} justifyContent="center">
              {uploaded.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Fade in timeout={500}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        maxWidth: 320,
                        mx: "auto",
                        boxShadow: 4,
                        transition: "transform 0.3s ease-in-out",
                        "&:hover": {
                          transform: "scale(1.03)",
                          boxShadow: 8,
                        },
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="180"
                        image={item.url}
                        alt={`Uploaded face ${index + 1}`}
                        sx={{ objectFit: "cover" }}
                      />
                      <CardContent sx={{ px: 2, pt: 2, pb: 0 }}>
                        <Tooltip title="Mở trong tab mới">
                          <Link
                            href={item.url}
                            target="_blank"
                            rel="noopener"
                            sx={{
                              fontSize: 13,
                              display: "inline-block",
                              maxWidth: "100%",
                              overflowWrap: "break-word",
                              color: "primary.main",
                            }}
                          >
                            {item.url}
                          </Link>
                        </Tooltip>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          variant={item.copied ? "outlined" : "contained"}
                          color={item.copied ? "success" : "primary"}
                          startIcon={
                            item.copied ? (
                              <CheckCircleIcon />
                            ) : (
                              <ContentCopyIcon />
                            )
                          }
                          onClick={() => copyToClipboard(index)}
                        >
                          {item.copied ? "Đã sao chép" : "Sao chép link"}
                        </Button>
                      </CardActions>
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        <Snackbar
          open={toastOpen}
          autoHideDuration={2500}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToastOpen(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            {toastMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default App;
