const activityScores = {
  bike: { label: "Used bicycle", points: 10 },
  electricity: { label: "Saved electricity", points: 8 },
  recycle: { label: "Recycled waste", points: 6 },
  bag: { label: "Used reusable bag", points: 5 },
  custom: { label: "Custom activity", points: 4 }
};

const state = {
  totalPoints: 0,
  activities: []
};

const form = document.querySelector("#activityForm");
const activitySelect = document.querySelector("#activitySelect");
const customField = document.querySelector("#customField");
const customActivity = document.querySelector("#customActivity");
const formMessage = document.querySelector("#formMessage");
const totalPoints = document.querySelector("#totalPoints");
const latestPoints = document.querySelector("#latestPoints");
const activityCount = document.querySelector("#activityCount");
const listStatus = document.querySelector("#listStatus");
const activityList = document.querySelector("#activityList");

activitySelect.addEventListener("change", () => {
  const isCustom = activitySelect.value === "custom";
  customField.hidden = !isCustom;
  if (!isCustom) {
    customActivity.value = "";
  }
  clearMessage();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedValue = activitySelect.value;
  if (!selectedValue) {
    showMessage("Choose an activity before adding it.");
    activitySelect.focus();
    return;
  }

  const score = activityScores[selectedValue];
  const customLabel = customActivity.value.trim();
  if (selectedValue === "custom" && customLabel.length === 0) {
    showMessage("Enter a custom activity name.");
    customActivity.focus();
    return;
  }

  const activity = {
    label: selectedValue === "custom" ? customLabel : score.label,
    points: score.points,
    time: formatTime(new Date())
  };

  state.activities.unshift(activity);
  state.totalPoints += activity.points;

  render();
  resetForm();
});

function render() {
  totalPoints.textContent = String(state.totalPoints);
  latestPoints.textContent = state.activities.length ? String(state.activities[0].points) : "0";
  activityCount.textContent = String(state.activities.length);
  listStatus.textContent = state.activities.length
    ? `${state.activities.length} activity${state.activities.length === 1 ? "" : "ies"} logged today.`
    : "No activities yet.";

  activityList.replaceChildren(
    ...state.activities.map((activity) => {
      const item = document.createElement("li");
      item.className = "activity-item";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = activity.label;
      const time = document.createElement("span");
      time.textContent = `Added at ${activity.time}`;
      details.append(title, time);

      const points = document.createElement("div");
      points.className = "activity-item__points";
      points.textContent = `+${activity.points}`;

      item.append(details, points);
      return item;
    })
  );
}

function resetForm() {
  form.reset();
  customField.hidden = true;
  clearMessage();
  activitySelect.focus();
}

function showMessage(message) {
  formMessage.textContent = message;
}

function clearMessage() {
  formMessage.textContent = "";
}

function formatTime(date) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

render();
