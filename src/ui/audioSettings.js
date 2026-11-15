const statusText = {
  locked: "Sound is waiting for a tap or key press.",
  muted: "All game audio is muted.",
  ready: "Game audio is ready.",
  unavailable: "Audio is unavailable in this browser.",
};

export function mountAudioSettings({ audio, master, volume, volumeText, ambience, status }) {
  function render(state) {
    const unavailable = state.status === "unavailable";
    master.checked = state.enabled;
    master.disabled = unavailable;
    volume.disabled = ambience.disabled = unavailable || !state.enabled;
    const percent = Math.round(state.volume * 100);
    volume.value = percent;
    volumeText.textContent = `${percent}%`;
    ambience.checked = state.ambience;
    const message = statusText[state.status];
    if (status.textContent !== message) status.textContent = message;
  }

  master.addEventListener("change", (event) => {
    audio.setPreferences({ enabled: master.checked });
    audio.unlock(event);
  });
  volume.addEventListener("input", () => audio.setPreferences({ volume: Number(volume.value) / 100 }));
  ambience.addEventListener("change", (event) => {
    audio.setPreferences({ ambience: ambience.checked });
    audio.unlock(event);
  });
  audio.subscribe(render);
  render(audio.getState());
}
