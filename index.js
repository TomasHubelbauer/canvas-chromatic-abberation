window.addEventListener('load', () => {
  const canvas = document.getElementById('demoCanvas');
  const context = canvas.getContext('2d');

  const staticSourceInput = document.getElementById('staticSourceInput');
  const dynamicSourceInput = document.getElementById('dynamicSourceInput');

  staticSourceInput.addEventListener('change', () => renderStatic(context));

  dynamicSourceInput.addEventListener('change', async () => {
    try {
      await renderDynamic(context)
    } catch (error) {
      alert('Something went wront with obtaining the live video feed.\n' + error.toString());

      // Switch back to static in case there is a problem with obtaining the camera
      staticSourceInput.checked = true;
      renderStatic(context);
    }
  });

  document.getElementById('intensityInput').addEventListener('input', () => {
    // Handle only static as dynamic reads the values in rAF
    if (staticSourceInput.checked) {
      renderStatic(context);
    }
  });

  document.getElementById('phaseInput').addEventListener('input', () => {
    // Handle only static as dynamic reads the values in rAF
    if (staticSourceInput.checked) {
      renderStatic(context);
    }
  });

  document.getElementById('cameraSelect').addEventListener('change', async () => {
    // Switch to static for a moment so that the video gets released if it is already playing
    staticSourceInput.checked = true;
    await new Promise(resolve => window.setTimeout(resolve, 100));

    dynamicSourceInput.checked = true;

    try {
      await renderDynamic(context);
    } catch (error) {
      alert('Something went wront with obtaining the live video feed.\n' + error.toString());

      // Switch back to static in case there is a problem with obtaining the camera
      staticSourceInput.checked = true;
      renderStatic(context);
    }
  })

  staticSourceInput.checked = true;
  renderStatic(context);
});

function renderStatic(/** @type {CanvasRenderingContext2D} */ context) {
  const image = new Image();
  // Slow down the request using the cache buster to ensure the video has time to stop (this is a hack)
  image.src = 'demo.jpg?' + Date.now();
  image.addEventListener('load', () => {
    context.canvas.width = image.naturalWidth;
    context.canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    chromaticAberration(imageData, document.getElementById('intensityInput').valueAsNumber, document.getElementById('phaseInput').valueAsNumber);
    context.putImageData(imageData, 0, 0);
  });
}

async function renderDynamic(/** @type {CanvasRenderingContext2D} */ context) {
  const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: document.getElementById('cameraSelect').value }, audio: false });
  const liveVideo = document.createElement('video');
  liveVideo.srcObject = mediaStream;

  // https://stackoverflow.com/a/54678952/2715716
  liveVideo.setAttribute('autoplay', '');
  liveVideo.setAttribute('muted', '');
  liveVideo.setAttribute('playsinline', '');
  await liveVideo.play();

  function render() {
    context.canvas.width = liveVideo.videoWidth;
    context.canvas.height = liveVideo.videoHeight;
    context.drawImage(liveVideo, 0, 0);
    const imageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
    chromaticAberration(imageData, document.getElementById('intensityInput').valueAsNumber, document.getElementById('phaseInput').valueAsNumber);
    context.putImageData(imageData, 0, 0);

    if (document.getElementById('dynamicSourceInput').checked) {
      window.requestAnimationFrame(render);
    } else {
      delete liveVideo.srcObject;
      for (let track of mediaStream.getTracks()) {
        track.stop();
      }
    }
  }

  window.requestAnimationFrame(render);
}

// https://gist.github.com/lqt0223/8a258b68ae1c032fa1fb1e26c4965e8d
function chromaticAberration(imageData, intensity, phase) {
  const data = imageData.data; // RGBA
  for (let i = phase % 4; i < data.length; i += 4) {
    // Setting the start of the loop to a different integer will change the aberration color, but a start integer of 4n-1 will not work
    data[i] = data[i + 4 * intensity];
  }
}
