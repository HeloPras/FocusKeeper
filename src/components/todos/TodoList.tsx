import { useEffect, useMemo, useState } from 'react';
import { LIMITS } from '../../constants';
import { tasksForDate, summarizeTasks } from '../../statistics/compute';
import { createTodo, deleteTodo, pruneCompletedTodos, saveTodo, updateTodo } from '../../storage/todoStorage';
import type { Settings } from '../../types/settings';
import type { Todo } from '../../types/todo';
import { dateKey, formatDayLong } from '../../utils/date';
import './TodoList.css';

type Filter = 'pending' | 'completed';

function dueLabel(todo: Todo, today: string) {
	if (todo.completed) return <span className="td-meta">Done {todo.completedAt ? formatDayLong(dateKey(todo.completedAt)) : ''}</span>;
	if (todo.date === today) return <span className="td-meta">Today</span>;
	if (todo.date < today) return <span className="td-meta td-late">Overdue since {formatDayLong(todo.date)}</span>;
	return <span className="td-meta">Planned for {formatDayLong(todo.date)}</span>;
}

function PencilIcon() {
	return (
		<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
			<path d="M12.5 4.5l3 3M4 16l.8-3.2L13.6 4a1.4 1.4 0 012 0l.4.4a1.4 1.4 0 010 2L7.2 15.2 4 16z" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
			<path d="M4 6h12M8 6V4.5h4V6M6 6l.6 9.5a1 1 0 001 .9h4.8a1 1 0 001-.9L14 6" />
		</svg>
	);
}

export function TodoList({ todos, settings, today }: { todos: Todo[]; settings: Settings; today: string }) {
	const [filter, setFilter] = useState<Filter>('pending');
	const [title, setTitle] = useState('');
	const [date, setDate] = useState(today);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editText, setEditText] = useState('');

	useEffect(() => {
		void pruneCompletedTodos(settings.todos.keepCompletedDays);
	}, [settings.todos.keepCompletedDays]);

	const summary = useMemo(() => summarizeTasks(tasksForDate(todos, today, today, settings.todos.carryOverIncomplete)), [todos, today, settings.todos.carryOverIncomplete]);
	const pending = useMemo(() => todos.filter((t) => !t.completed).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt), [todos]);
	const completed = useMemo(() => todos.filter((t) => t.completed).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 100), [todos]);
	const visible = filter === 'pending' ? pending : completed;

	const add = async () => {
		const clean = title.trim();
		if (!clean) return;
		await saveTodo(createTodo(clean, date || today));
		setTitle('');
	};
	const commitEdit = async () => {
		if (editingId && editText.trim()) await updateTodo(editingId, { title: editText });
		setEditingId(null);
	};

	const ratio = summary.total > 0 ? summary.completed / summary.total : 0;
	const allDone = summary.total > 0 && summary.completed === summary.total;

	return (
		<div className="td">
			{/* Today summary */}
			<header className="td-today">
				<h2 className="td-heading">Today's tasks</h2>
				<p className="td-count">
					<span className="td-count-num">{summary.completed}</span> of {summary.total} done
					{summary.total > 0 && <span className="td-pct">{summary.completionRate}%</span>}
					{allDone && <span className="td-badge">All clear</span>}
				</p>
				<div
					className="td-bar"
					role="progressbar"
					aria-label="Tasks completed today"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(ratio * 100)}
				>
					<span style={{ width: `${ratio * 100}%` }} />
				</div>
			</header>

			{/* Composer */}
			<form className="td-composer" onSubmit={(e) => { e.preventDefault(); void add(); }}>
				<input
					className="td-composer-input"
					value={title}
					maxLength={LIMITS.todoTitleLength}
					placeholder="What do you want to get done?"
					aria-label="Task title"
					onChange={(e) => setTitle(e.target.value)}
				/>
				<div className="td-composer-bar">
					<label className="td-date">
						<span className="td-date-label">Plan for</span>
						<input type="date" value={date} aria-label="Planned for" onChange={(e) => setDate(e.target.value)} />
					</label>
					<button className="td-add" type="submit" disabled={!title.trim()}>Add task</button>
				</div>
			</form>

			{/* List */}
			<section className="td-list-wrap" aria-label="Tasks">
				<div className="td-tabs" role="group" aria-label="Filter tasks">
					<button aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>
						Pending <span className="td-tab-count">{pending.length}</span>
					</button>
					<button aria-pressed={filter === 'completed'} onClick={() => setFilter('completed')}>
						Completed <span className="td-tab-count">{completed.length}</span>
					</button>
				</div>

				{visible.length === 0 ? (
					<div className="td-empty">
						{filter === 'pending' ? (
							<>
								<p className="td-empty-title">Nothing pending</p>
								<p className="td-empty-hint">Add a task above to plan your day.</p>
							</>
						) : (
							<>
								<p className="td-empty-title">No completed tasks yet</p>
								<p className="td-empty-hint">Finished tasks show up here.</p>
							</>
						)}
					</div>
				) : (
					<ul className="td-list">
						{visible.map((t) => {
							const late = !t.completed && t.date < today;
							const isEditing = editingId === t.id;
							return (
								<li key={t.id} className={`td-item${t.completed ? ' is-done' : ''}${late ? ' is-late' : ''}`}>
									<input
										className="td-check"
										type="checkbox"
										checked={t.completed}
										aria-label={`Mark "${t.title}" ${t.completed ? 'not done' : 'done'}`}
										onChange={() => void updateTodo(t.id, { completed: !t.completed })}
									/>
									<div className="td-body">
										{isEditing ? (
											<input
												className="td-edit-input"
												autoFocus
												value={editText}
												maxLength={LIMITS.todoTitleLength}
												aria-label="Edit task title"
												onChange={(e) => setEditText(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === 'Enter') void commitEdit();
													if (e.key === 'Escape') setEditingId(null);
												}}
											/>
										) : (
											<div className="td-title">{t.title}</div>
										)}
										{dueLabel(t, today)}
									</div>
									<div className="td-actions">
										{isEditing ? (
											<>
												<button className="td-text-btn td-text-btn-main" onClick={() => void commitEdit()}>Save</button>
												<button className="td-text-btn" onClick={() => setEditingId(null)}>Cancel</button>
											</>
										) : (
											<>
												<button className="td-icon-btn" aria-label={`Edit "${t.title}"`} title="Edit" onClick={() => { setEditingId(t.id); setEditText(t.title); }}>
													<PencilIcon />
												</button>
												<button className="td-icon-btn td-danger" aria-label={`Delete "${t.title}"`} title="Delete" onClick={() => void deleteTodo(t.id)}>
													<TrashIcon />
												</button>
											</>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</div>
	);
}
