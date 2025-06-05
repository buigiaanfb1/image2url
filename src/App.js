import { useState } from "react";
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

import {
  Container,
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
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

function App() {
  const [images, setImages] = useState([]);
  const [uploaded, setUploaded] = useState([]); // Array of { url, copied }
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadImages = async () => {
    if (!images.length) {
      setToastMessage("Please choose image(s)");
      setToastOpen(true);
      return;
    }

    setUploading(true);
    const newUploads = [];

    for (const image of images) {
      const imageRef = ref(storage, `faces/${uuidv4()}`);
      await uploadBytes(imageRef, image);
      const downloadUrl = await getDownloadURL(imageRef);
      newUploads.push({ url: downloadUrl, copied: false });
    }

    setUploaded((prev) => [...prev, ...newUploads]);
    setToastMessage("Upload successful!");
    setToastOpen(true);
    setImages([]);
    setUploading(false);
  };

  const copyToClipboard = (index) => {
    navigator.clipboard.writeText(uploaded[index].url).then(() => {
      setUploaded((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, copied: true } : item
        )
      );
      setToastMessage("Copied to clipboard!");
      setToastOpen(true);

      setTimeout(() => {
        setUploaded((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, copied: false } : item
          )
        );
      }, 2000);
    });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        py: 6,
        px: 2,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 4,
          p: 4,
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold", letterSpacing: 1 }}
        >
          Thêm ảnh thành viên
        </Typography>

        {/* Custom file input with button */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="center"
          mb={4}
        >
          <Button
            variant="contained"
            component="label"
            sx={{ px: 4, py: 1.5, fontWeight: "medium" }}
          >
            Chọn ảnh
            <input
              hidden
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setImages(Array.from(e.target.files))}
            />
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={uploadImages}
            disabled={uploading || !images.length}
            sx={{ px: 5, py: 1.5, fontWeight: "medium", position: "relative" }}
          >
            {uploading ? (
              <CircularProgress
                size={24}
                color="inherit"
              />
            ) : (
              "Lấy đường dẫn"
            )}
          </Button>
        </Stack>

        {images.length > 0 && (
          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            mb={4}
          >
            {images.length} ảnh{images.length > 1 ? "s" : ""} đã được chọn
          </Typography>
        )}

        {uploaded.length > 0 && (
          <>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: "medium", mb: 3 }}
            >
              Ảnh đã lưu
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              flexWrap="wrap"
              justifyContent="center"
            >
              {uploaded.map((item, index) => (
                <Card
                  key={index}
                  sx={{
                    maxWidth: 280,
                    flexGrow: 1,
                    borderRadius: 2,
                    boxShadow: 6,
                    position: "relative",
                    transition: "transform 0.2s ease-in-out",
                    "&:hover": {
                      transform: "scale(1.03)",
                      boxShadow: 10,
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
                    <Link
                      href={item.url}
                      target="_blank"
                      rel="noopener"
                      sx={{
                        fontSize: 14,
                        wordBreak: "break-word",
                        color: "primary.main",
                      }}
                    >
                      {item.url}
                    </Link>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      variant={item.copied ? "outlined" : "contained"}
                      color={item.copied ? "success" : "primary"}
                      startIcon={
                        item.copied ? <CheckCircleIcon /> : <ContentCopyIcon />
                      }
                      onClick={() => copyToClipboard(index)}
                      sx={{
                        textTransform: "none",
                        fontWeight: "medium",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {item.copied ? "Copied!" : "Copy Link"}
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Stack>
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
