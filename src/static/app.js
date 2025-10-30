document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Avoid cached responses so updates (signup/unregister) appear immediately in the UI
      const response = await fetch("/activities", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const activities = await response.json();

      // Clear loading message and reset select (keep placeholder)
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Normalize activities to entries: [name, details]
      let entries = [];
      if (Array.isArray(activities)) {
        // support array of activity objects: each item should contain a name/title/id
        entries = activities.map((a) => {
          const name = a.name || a.id || a.title || "Unnamed Activity";
          return [name, a];
        });
      } else if (activities && typeof activities === "object") {
        entries = Object.entries(activities);
      } else {
        throw new Error("Unexpected activities format");
      }

      // Populate activities list
      entries.forEach(([name, details]) => {
        // Ensure participants is always an array
        details.participants = Array.isArray(details.participants) ? details.participants : [];

        // Build card using DOM methods (avoid innerHTML overwrite issues)
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const desc = document.createElement("p");
        desc.textContent = details.description || "";
        activityCard.appendChild(desc);

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule || "TBA"}`;
        activityCard.appendChild(schedule);

        const spotsLeft = (details.max_participants || 0) - details.participants.length;
        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
        activityCard.appendChild(availability);

        // Participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants-section";

        const heading = document.createElement("h5");
        heading.textContent = "Participants ";
        const countSpan = document.createElement("span");
        countSpan.className = "participant-count";
        countSpan.textContent = `(${details.participants.length})`;
        heading.appendChild(countSpan);
        participantsDiv.appendChild(heading);

        const ul = document.createElement("ul");
        ul.className = "participants-list";

        if (details.participants.length === 0) {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No participants yet";
          ul.appendChild(li);
        } else {
          details.participants.forEach((p) => {
            const li = document.createElement("li");

            // participant email text
            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = p;

            // delete/unregister button (simple X icon)
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.setAttribute("aria-label", `Unregister ${p} from ${name}`);
            deleteBtn.title = `Unregister ${p}`;
            deleteBtn.textContent = "✖";

            // When clicked, call backend to remove participant, then refresh list
            deleteBtn.addEventListener("click", async () => {
              // optional: simple confirm step
              const doIt = confirm(`Unregister ${p} from ${name}?`);
              if (!doIt) return;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );

                const data = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = data.message || `Unregistered ${p}`;
                  messageDiv.className = "message success";
                  messageDiv.classList.remove("hidden");

                  // Refresh activities so UI updates
                  await fetchActivities();
                } else {
                  messageDiv.textContent = data.detail || "Failed to unregister";
                  messageDiv.className = "message error";
                  messageDiv.classList.remove("hidden");
                }

                setTimeout(() => {
                  messageDiv.classList.add("hidden");
                }, 4000);
              } catch (err) {
                console.error("Error unregistering:", err);
                messageDiv.textContent = "Failed to unregister. Please try again.";
                messageDiv.className = "message error";
                messageDiv.classList.remove("hidden");
              }
            });

            li.appendChild(emailSpan);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
          });
        }

        participantsDiv.appendChild(ul);
        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so new participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
