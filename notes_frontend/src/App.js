import React, { useState, useEffect, useRef } from "react";
import "./App.css";

/**
 * A minimalistic notes application with sidebar (tags/folders), notes list, main editor, and search functionality.
 * Notes are persisted to localStorage.
 *
 * Light theme, minimal design, no external UI framework.
 */

// Util: Unique ID for notes
const uid = () => "_" + Math.random().toString(36).slice(2, 11);

/** Demo tags/categories. Future: could make these dynamic */
const DEFAULT_TAGS = ["All Notes", "Work", "Personal", "Ideas"];

/**
 * Loads notes from localStorage, parsed as JSON.
 */
function loadNotes() {
  try {
    const data = localStorage.getItem("notes");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save notes array to localStorage
 */
function saveNotes(notes) {
  localStorage.setItem("notes", JSON.stringify(notes));
}

// PUBLIC_INTERFACE
function App() {
  // Persistent notes array
  const [notes, setNotes] = useState(loadNotes());
  // Sidebar: selected tag string (category filter)
  const [selectedTag, setSelectedTag] = useState("All Notes");
  // Notes list: selected note id (null for no selection)
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  // Main area states
  const [isEditing, setIsEditing] = useState(false);
  // Editor fields
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState([]);
  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  // Focus for new/edit note UX
  const titleInputRef = useRef();

  // Load from localStorage on mount, re-save anytime notes changes
  useEffect(() => saveNotes(notes), [notes]);

  // Extract all tags used (for rendering sidebar + 'All Notes')
  const allTags = React.useMemo(() => {
    const tags = new Set(DEFAULT_TAGS);
    notes.forEach(note => note.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  // Returns visible notes for notes list (search + tag filter)
  const filteredNotes = React.useMemo(() => {
    let result = notes;
    if (selectedTag && selectedTag !== "All Notes") {
      result = result.filter(note => note.tags.includes(selectedTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        note =>
          note.title.toLowerCase().includes(q) ||
          note.body.toLowerCase().includes(q)
      );
    }
    // List newest first
    return result.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedTag, searchQuery]);

  // The currently-viewed note object, or null
  const currentNote =
    selectedNoteId && notes.find(n => n.id === selectedNoteId);

  /** HANDLERS **/

  // PUBLIC_INTERFACE
  function handleSelectTag(tag) {
    setSelectedTag(tag);
    setSelectedNoteId(null); // clear selection when switching tags
    setIsEditing(false);
  }

  // PUBLIC_INTERFACE
  function handleSelectNote(noteId) {
    setSelectedNoteId(noteId);
    setIsEditing(false);
  }

  // PUBLIC_INTERFACE
  function handleNewNote() {
    setIsEditing(true);
    setSelectedNoteId(null);
    setEditTitle("");
    setEditBody("");
    setEditTags([selectedTag !== "All Notes" ? selectedTag : ""]);
    setTimeout(() => titleInputRef.current && titleInputRef.current.focus(), 100);
  }

  // PUBLIC_INTERFACE
  function handleEditNote() {
    if (!currentNote) return;
    setIsEditing(true);
    setEditTitle(currentNote.title);
    setEditBody(currentNote.body);
    setEditTags([...currentNote.tags]);
    setTimeout(() => titleInputRef.current && titleInputRef.current.focus(), 100);
  }

  // PUBLIC_INTERFACE
  function handleDeleteNote(noteId) {
    if (!window.confirm("Delete this note?")) return;
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    setSelectedNoteId(null);
    setIsEditing(false);
  }

  // PUBLIC_INTERFACE
  function handleSaveNote(e) {
    e.preventDefault();
    const title = editTitle.trim();
    const body = editBody.trim();
    let tags = editTags.filter(tag => tag && tag.trim());
    if (!title) {
      alert("Note title required");
      return;
    }
    if (!tags.length) tags = ["Untagged"];
    // Editing existing note
    if (selectedNoteId && currentNote) {
      setNotes(notes =>
        notes.map(n =>
          n.id === selectedNoteId
            ? {
                ...n,
                title,
                body,
                tags,
                updatedAt: Date.now()
              }
            : n
        )
      );
    } else {
      // New note
      const newNote = {
        id: uid(),
        title,
        body,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setNotes(notes => [newNote, ...notes]);
      setSelectedNoteId(newNote.id);
    }
    setIsEditing(false);
  }
  // PUBLIC_INTERFACE
  function handleCancelEdit() {
    setIsEditing(false);
    if (!selectedNoteId) {
      setEditTitle("");
      setEditBody("");
      setEditTags([""]);
    }
  }

  // PUBLIC_INTERFACE
  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
  }

  // PUBLIC_INTERFACE
  function handleTagInputChange(i, value) {
    setEditTags(tags =>
      tags.map((t, idx) => (idx === i ? value : t))
    );
  }
  // PUBLIC_INTERFACE
  function handleAddTagField() {
    setEditTags(tags => [...tags, ""]);
  }
  // PUBLIC_INTERFACE
  function handleRemoveTagField(i) {
    setEditTags(tags => tags.filter((t, idx) => idx !== i));
  }

  // MAIN LAYOUT
  return (
    <div className="nk-app-root" style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)"
    }}>
      {/* Sidebar: Folders/Tags */}
      <aside className="nk-sidebar" style={{
        width: 220,
        borderRight: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        padding: "32px 0 16px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        boxSizing: "border-box"
      }}>
        <div className="nk-sidebar-header" style={{
          fontWeight: "bold",
          fontSize: 22,
          letterSpacing: 1,
          padding: "0 24px 20px 32px",
          borderBottom: "1px solid var(--border-color)"
        }}>
          Notes
        </div>
        <nav className="nk-sidebar-tags" style={{ marginTop: 16, flex: 1 }}>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleSelectTag(tag)}
              className={tag === selectedTag
                ? "nk-sidebar-tag nk-sidebar-tag--active"
                : "nk-sidebar-tag"}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "11px 32px",
                background: tag === selectedTag ? "var(--bg-primary)" : "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontWeight: tag === selectedTag ? 600 : 400,
                cursor: "pointer",
                borderRight: tag === selectedTag ? "4px solid var(--button-bg)" : "4px solid transparent",
                fontSize: 16,
                transition: "all 0.14s"
              }}
            >
              {tag}
            </button>
          ))}
        </nav>
        <div style={{ padding: "8px 24px 0 32px" }}>
          <button className="nk-btn nk-btn-primary" style={{
            width: "100%",
            background: "var(--button-bg)",
            color: "var(--button-text)",
            fontWeight: 600,
            fontSize: 15,
            border: "none",
            borderRadius: 7,
            padding: "10px",
            marginTop: 8,
            boxShadow: "0 1.5px 3px rgba(0,0,0,0.07)"
          }}
            onClick={handleNewNote}
          >+ New Note</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="nk-main" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "0"
      }}>
        {/* Header Bar: Search */}
        <div className="nk-headerbar" style={{
          height: 58,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)"
        }}>
          <input
            className="nk-search"
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: 290,
              fontSize: 16,
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              padding: "8px 14px",
              background: "var(--bg-primary)",
              color: "var(--text-primary)"
            }}
          />
        </div>

        <div className="nk-content" style={{
          flex: 1,
          display: "flex",
          minHeight: 0
        }}>
          {/* Notes List */}
          <section className="nk-notelist" style={{
            width: 290,
            borderRight: "1px solid var(--border-color)",
            padding: "18px 0 0 0",
            height: "100%",
            overflowY: "auto",
            background: "var(--bg-secondary)"
          }}>
            {filteredNotes.length === 0 ? (
              <div style={{
                color: "#9a9ea7",
                textAlign: "center",
                fontSize: 15,
                marginTop: 32
              }}>
                <span role="img" aria-label="empty box" style={{ fontSize: 32 }}>🗒️</span>
                <div style={{ marginTop: 7 }}>No notes found</div>
              </div>
            ) : (
              <ul style={{
                listStyle: "none", margin: 0, padding: 0
              }}>
                {filteredNotes.map(note => (
                  <li key={note.id}>
                    <button
                      onClick={() => handleSelectNote(note.id)}
                      className={note.id === selectedNoteId
                        ? "nk-notelist-item nk-notelist-item--active"
                        : "nk-notelist-item"}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: note.id === selectedNoteId ? "var(--bg-primary)" : "transparent",
                        border: "none",
                        borderLeft: note.id === selectedNoteId ? "4px solid var(--button-bg)" : "4px solid transparent",
                        borderRadius: note.id === selectedNoteId ? "0 0.7em 0.7em 0" : "0",
                        padding: "13px 19px 12px 21px",
                        color: "var(--text-primary)",
                        fontSize: "15px",
                        marginBottom: "2px",
                        cursor: "pointer",
                        outline: "none",
                        boxShadow: note.id === selectedNoteId ? "0 0 5px rgba(26,117,210,0.03)" : "none",
                        transition: "all 0.17s"
                      }}
                    >
                      <div style={{
                        fontWeight: 600,
                        marginBottom: 2,
                        display: "flex",
                        alignItems: "center"
                      }}>
                        {note.title.length > 30
                          ? note.title.slice(0, 28) + "…"
                          : note.title}
                      </div>
                      <div style={{
                        fontSize: 13, color: "#7e8aa6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                        {note.body.replace(/[\r\n]+/g, " ").slice(0, 38) + (note.body.length > 38 ? "…" : "")}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2, color: "#b7bac2" }}>
                        {note.tags.join(", ")}
                        <span style={{ marginLeft: 7, fontWeight: 300 }}>
                          {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Main Editor / Viewer Pane */}
          <section className="nk-editor" style={{
            flex: 1,
            padding: "34px 32px",
            boxSizing: "border-box",
            overflowY: "auto"
          }}>
            {
              isEditing ? (
                // Edit/Create note
                <form
                  onSubmit={handleSaveNote}
                  style={{
                    maxWidth: 680,
                    margin: "0 auto",
                    background: "var(--bg-secondary)",
                    border: "1.5px solid var(--border-color)",
                    borderRadius: 10,
                    boxShadow: "0 4px 14px #0001",
                    padding: "30px 30px 18px 30px"
                  }}
                >
                  <div>
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Title"
                      style={{
                        width: "100%",
                        fontSize: "22px",
                        fontWeight: 700,
                        padding: "9px 0",
                        border: "none",
                        borderBottom: "1.5px solid var(--border-color)",
                        background: "transparent",
                        marginBottom: 17,
                        color: "var(--text-primary)"
                      }}
                    />
                  </div>
                  <div>
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      placeholder="Start writing your note..."
                      rows={8}
                      style={{
                        width: "100%",
                        fontSize: 16,
                        minHeight: 133,
                        padding: "12px 0",
                        resize: "vertical",
                        border: "none",
                        background: "transparent",
                        color: "var(--text-primary)"
                      }}
                    />
                  </div>
                  <div style={{ margin: "19px 0 11px", fontSize: 15 }}>
                    Tags:{" "}
                    {editTags.map((t, i) => (
                      <span key={i} style={{ marginRight: 10 }}>
                        <input
                          type="text"
                          value={t}
                          onChange={e => handleTagInputChange(i, e.target.value)}
                          style={{
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            padding: "2px 7px",
                            fontSize: 14,
                            minWidth: 60,
                            background: "var(--bg-primary)",
                            color: "var(--text-primary)"
                          }}
                        />
                        {editTags.length > 1 && (
                          <button
                            type="button"
                            title="Remove tag"
                            style={{ border: "none", background: "none", color: "#cb2d28", fontWeight: 600, marginLeft: 2, cursor: "pointer", verticalAlign: "middle", fontSize: 17 }}
                            onClick={() => handleRemoveTagField(i)}
                          >×</button>
                        )}
                      </span>
                    ))}
                    <button type="button" style={{
                      border: "none",
                      background: "#ececec",
                      color: "#1a1a1a",
                      marginLeft: 3,
                      borderRadius: 6,
                      padding: "2px 10px",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer"
                    }} onClick={handleAddTagField}>+</button>
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 13,
                    marginTop: 12,
                    justifyContent: "flex-end"
                  }}>
                    <button type="button" onClick={handleCancelEdit}
                      className="nk-btn"
                      style={{
                        border: "1px solid var(--border-color)",
                        background: "#fff",
                        color: "#7e8aa6",
                        borderRadius: 8,
                        fontSize: 15,
                        padding: "9px 22px",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >Cancel</button>
                    <button type="submit"
                      className="nk-btn nk-btn-primary"
                      style={{
                        background: "var(--button-bg)",
                        color: "var(--button-text)",
                        fontWeight: 600,
                        fontSize: 16,
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 26px",
                        boxShadow: "0 1.5px 3.5px rgba(0,0,0,0.10)",
                        cursor: "pointer"
                      }}
                    >Save</button>
                  </div>
                </form>
              )
                : selectedNoteId && currentNote ? (
                  // View note mode
                  <div
                    className="nk-note-view"
                    style={{
                      maxWidth: 750,
                      margin: "0 auto",
                      background: "var(--bg-secondary)",
                      border: "1.5px solid var(--border-color)",
                      borderRadius: 13,
                      boxShadow: "0 4px 15px #0001",
                      padding: "42px 38px 20px 38px",
                      position: "relative",
                      minHeight: 280
                    }}
                  >
                    <h2 style={{
                      fontSize: 27,
                      margin: 0,
                      fontWeight: 700,
                      color: "#14346d",
                      letterSpacing: 0.5
                    }}>{currentNote.title}</h2>
                    <div style={{ minHeight: 70, margin: "17px 0 26px", fontSize: 16, color: "#474761" }}>
                      {currentNote.body.split("\n").map((l, idx) => (
                        <span key={idx}>{l}{idx < currentNote.body.split("\n").length - 1 ? <br /> : null}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", color: "#606067", fontSize: 14 }}>
                      <span>Tags: {currentNote.tags.join(", ")}</span>
                      <span>Last updated: {new Date(currentNote.updatedAt).toLocaleString()}</span>
                    </div>
                    <div style={{
                      position: "absolute", top: 22, right: 37, display: "flex", gap: 8
                    }}>
                      <button
                        title="Edit note"
                        onClick={handleEditNote}
                        className="nk-btn"
                        style={{
                          border: "none",
                          background: "#f6f8fa",
                          color: "#1a1a1a",
                          borderRadius: "7px",
                          padding: "7px 17px",
                          fontWeight: 700,
                          fontSize: 15,
                          marginLeft: 2,
                          cursor: "pointer"
                        }}
                      >Edit</button>
                      <button
                        title="Delete note"
                        className="nk-btn"
                        style={{
                          border: "none",
                          background: "#ffebe8",
                          color: "#cb2d28",
                          borderRadius: "7px",
                          padding: "7px 16px",
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: "pointer"
                        }}
                        onClick={() => handleDeleteNote(currentNote.id)}
                      >Delete</button>
                    </div>
                  </div>
                ) :
                  // Blank state / select-a-note
                  <div style={{
                    textAlign: "center",
                    color: "#b6b6bb",
                    marginTop: 87,
                    fontSize: 23,
                    letterSpacing: 0.5,
                    fontWeight: 500
                  }}>
                    <span role="img" aria-label="waves" style={{ fontSize: 58, opacity: 0.47 }}>🌊</span>
                    <div style={{
                      fontSize: 22, color: "#8b8ba0", marginTop: 21
                    }}>
                      {filteredNotes.length === 0 ? "No notes (yet!)" : "Select a note to view or edit."}
                    </div>
                  </div>
            }
          </section>
        </div>
        {/* Minimal footer: */}
        <footer className="nk-footer" style={{
          background: "var(--bg-secondary)",
          color: "#888a94",
          fontSize: 14,
          textAlign: "center",
          letterSpacing: 1,
          padding: "17px",
          borderTop: "1px solid var(--border-color)"
        }}>
          Notes App &middot; Minimal demo (<a href="https://reactjs.org/" style={{ color: "#1976d2" }}>React</a>)
        </footer>
      </main>
    </div>
  );
}

export default App;
