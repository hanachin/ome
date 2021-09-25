import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Paper, Slider, Snackbar, TextField, Typography } from '@mui/material';
import { Box } from '@mui/system';

const FONT_SIZE = 12
const LINE_HEIGHT = Math.ceil(FONT_SIZE * 1.1)
const FONT = `${FONT_SIZE}px DotGothic16`

function App() {
  const [message, setMessage] = useState('HBD')
  const [foreground, setForeground] = useState(':tada:')
  const [background, setBackground] = useState(':ome:')
  const [slackEmoji, setSlackEmoji] = useState('')
  const [threshold, setThreshold] = useState(64)
  const [snackBarOpen, setSnackBarOpen] = useState(false)
  const handleMessageChange = useCallback((event) => setMessage(event.target.value), [])
  const handleForegroundChange = useCallback((event) => setForeground(event.target.value), [])
  const handleBackgroundChange = useCallback((event) => setBackground(event.target.value), [])
  const handleThresholdChange = useCallback((_event, newThreshold) => setThreshold(newThreshold), [])
  const handleSlackEmojiClick = async () => {
    await navigator.clipboard.writeText(slackEmoji)
    setSnackBarOpen(true)
  }
  const handleSnackbarClose = () => setSnackBarOpen(false)

  const [fontReady, setFontReady] = useState(false)
  useEffect(() => {
    async function waitFontReady() {
      const fontFaceSet = await document.fonts.ready
      const dotGothicLoaded = await fontFaceSet.load(FONT)
      if (dotGothicLoaded) {
        setFontReady(true)
      } else {
        throw new Error('dotGothic load failed')
      }
    }
    waitFontReady()
  }, [])
  const canvasRef = useRef()
  useEffect(() => {
    if (!canvasRef.current) return
    if (!fontReady) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.font = FONT
    ctx.textBaseline = 'top'

    const lines = message.split(/\n/g)
    const maxLineWidth = Math.max(...lines.map(m => Math.ceil(ctx.measureText(m).width)))

    if (!lines.length || !maxLineWidth) {
      setSlackEmoji('')
      return
    }

    canvas.width = maxLineWidth * 1.5
    canvas.height = LINE_HEIGHT * lines.length
    lines.forEach((m, index) => {
      ctx.fillText(m, 0, LINE_HEIGHT * index + FONT_SIZE)
    })

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = imageData.width
    let emoji = ''
    for (let i = 0, j = 1; i < data.length; i += 4, j++) {
      const alpha = data[i + 3]
      emoji += alpha > threshold ? foreground : background
      if (j % width === 0) {
        emoji += "\n"
      }
    }
    emoji = emoji.replace(new RegExp(`^((?:${background})+)$\n(?:^(?:${background})+$\n)+`, 'gm'), '$1\n')
    const trailingBackgroundMatches = [...emoji.matchAll(new RegExp(`(?:${background})+$`, 'gm'))]
    const trailingBackgrounds = trailingBackgroundMatches.map(match => match[0].length / background.length)
    const minTrailingBackgrounds = Math.min(...trailingBackgrounds)
    emoji = emoji.replace(new RegExp(`(?:${background}){${minTrailingBackgrounds}}$`, 'gm'), background)
    setSlackEmoji(emoji)

    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [background, fontReady, foreground, message, threshold])

  if (!fontReady) {
    return <Container sx={{font: FONT}}>loading</Container>
  }

  return (
    <Container>
      <Snackbar open={snackBarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} message="コピーしました" />
      <Box m={1}>
        <Paper>
          <Box p={1} sx={{display: 'flex', justifyContent: 'center'}}>
            <canvas ref={canvasRef} height={LINE_HEIGHT} />
          </Box>
          <Box p={1} sx={{display: 'flex', '& > :not(style)': { flex: 1 }}}>
            <TextField label="メッセージ" value={message} onChange={handleMessageChange} multiline />
          </Box>
          <Box sx={{display: 'flex', justifyContent: 'space-between', '& > :not(style)': {m: 1, flex: 1}}}>
            <TextField label="前景" value={foreground} onChange={handleForegroundChange} />
            <TextField label="背景" value={background} onChange={handleBackgroundChange} />
          </Box>
          <Box p={1} sx={{display: 'flex', flexDirection: 'column', '& > :not(style)': { flex: 1 }}}>
            <Typography variant="body2" gutterBottom>背景・前景 境界値</Typography>
            <Slider max={255} value={threshold} onChange={handleThresholdChange} />
          </Box>
          {slackEmoji && (
            <Box p={1} sx={{display: 'flex', '& > :not(style)': { flex: 1 }}}>
              <TextField
                label="クリックしてコピー"
                value={slackEmoji}
                variant="filled"
                InputProps={{readOnly: true, sx: {cursor: 'pointer', '& > *': { cursor: 'pointer'}}}}
                sx={{cursor: 'pointer'}}
                onClick={handleSlackEmojiClick}
                multiline
              />
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
