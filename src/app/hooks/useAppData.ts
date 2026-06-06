import {useCallback, useRef, useState} from 'react';

import type {Category, Task, TaskExecutionSession} from '../../../shared/domain/entities';
import {toIsoDate} from '../../../shared/lib/date';
import {categoriesApi} from '../../modules/categories/api/categoriesApi';
import {focusApi} from '../../modules/focus/api/focusApi';
import {tasksApi} from '../../modules/tasks/api/tasksApi';

export function useAppData() {
  const selectedDateLoadSeqRef = useRef(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDateSessions, setSelectedDateSessions] = useState<TaskExecutionSession[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDateState] = useState(() => toIsoDate(new Date()));

  const refreshCategories = useCallback(async () => {
    const data = await categoriesApi.getCategories();
    setCategories(data);
    return data;
  }, []);

  const refreshAllTasks = useCallback(async () => {
    const data = await tasksApi.getTasks();
    setAllTasks(data);
    return data;
  }, []);

  const setSelectedDate = useCallback((value: string) => {
    selectedDateLoadSeqRef.current += 1;
    setSelectedDateState(value);
  }, []);

  const loadTasksForSelectedDate = useCallback(async () => {
    const loadSeq = selectedDateLoadSeqRef.current + 1;
    selectedDateLoadSeqRef.current = loadSeq;
    const data = await tasksApi.getTasks({date: selectedDate});
    if (loadSeq !== selectedDateLoadSeqRef.current) {
      return {tasks: data, sessions: []};
    }
    setTasks(data);
    const sessionData = await focusApi.getSessions({date: selectedDate});
    if (loadSeq !== selectedDateLoadSeqRef.current) {
      return {tasks: data, sessions: sessionData};
    }
    setSelectedDateSessions(sessionData);
    return {tasks: data, sessions: sessionData};
  }, [selectedDate]);

  const loadMetaData = useCallback(async () => {
    const loadSeq = selectedDateLoadSeqRef.current + 1;
    selectedDateLoadSeqRef.current = loadSeq;
    setLoading(true);
    try {
      const catsData = await categoriesApi.getCategories();
      setCategories(catsData);
      const tasksData = await tasksApi.getTasks({date: selectedDate});
      if (loadSeq === selectedDateLoadSeqRef.current) {
        setTasks(tasksData);
      }
      const all = await tasksApi.getTasks();
      setAllTasks(all);
      return {categories: catsData, tasks: tasksData, allTasks: all};
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  return {
    categories,
    tasks,
    selectedDateSessions,
    allTasks,
    loading,
    setLoading,
    selectedDate,
    setSelectedDate,
    refreshCategories,
    refreshAllTasks,
    loadTasksForSelectedDate,
    loadMetaData,
  };
}
