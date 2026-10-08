import { Blockquote, Stack } from '@mantine/core';
import type { Annotation, Task } from '@medplum/fhirtypes';
import type { JSX } from 'react';

export interface NotesPageProps {
  readonly task: Task;
}

export function NotesPage(props: NotesPageProps): JSX.Element {
  const notes = props.task.note;

  if (!notes) {
    return (
      <div style={{ marginTop: 20 }}>
        <p>No Notes</p>
      </div>
    );
  }

  // Sort notes so the most recent are at the top of the page
  const sortedNotes = sortNotesByTime(notes);

  // Display if the task does not have any notes

  return (
    <div style={{ marginTop: 20 }}>
      <Stack>
        {sortedNotes.map(
          (note) =>
            note.text && (
              <Blockquote
                key={`note-${note.text}`}
                cite={`${note.authorReference?.display || note.authorString} – ${note.time?.slice(0, 10)}`}
                icon={null}
              >
                {note.text}
              </Blockquote>
            )
        )}
      </Stack>
    </div>
  );
}

function sortNotesByTime(notes: Annotation[]): Annotation[] {
  const compareTimes = (a: Annotation, b: Annotation): number => {
    const timeA = new Date(a.time || 0).getTime();
    const timeB = new Date(b.time || 0).getTime();

    return timeB - timeA;
  };

  const sortedNotes = notes.sort(compareTimes);
  return sortedNotes;
}
