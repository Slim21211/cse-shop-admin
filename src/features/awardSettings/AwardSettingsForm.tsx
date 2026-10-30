import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  type AwardSettings,
  type Indicator,
  PRO_OPTS,
  fetchAwardSettings,
  saveAwardSettings,
} from './api';

// Предпросмотр баллов до сохранения. Окончательно их считает база тем же
// округлением вниз (см. sql/award_settings.sql).
const toPoints = (max: number, pct: number) =>
  Number.isFinite(max) && Number.isFinite(pct)
    ? Math.floor((max * pct) / 100)
    : 0;

const isPct = (v: number) => Number.isInteger(v) && v >= 0 && v <= 100;

// пустое поле -> NaN, чтобы не подставлять 0 молча и показать ошибку
const parseNum = (v: string) => (v.trim() === '' ? NaN : Number(v));

function NumberField({
  label,
  value,
  onChange,
  suffix,
  helper,
  error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  helper?: string;
  error?: boolean;
}) {
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={Number.isNaN(value) ? '' : value}
      onChange={(e) => onChange(parseNum(e.target.value))}
      error={error}
      helperText={helper}
      slotProps={{
        input: {
          endAdornment: (
            <Typography color="text.secondary">{suffix}</Typography>
          ),
        },
        htmlInput: { min: 0, step: 1 },
      }}
      sx={{ width: 220 }}
    />
  );
}

function IndicatorSection({
  title,
  hint,
  value,
  max,
  onChange,
}: {
  title: string;
  hint: string;
  value: Indicator;
  max: number;
  onChange: (patch: Partial<Indicator>) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NumberField
          label="Вес"
          value={value.pct}
          onChange={(pct) => onChange({ pct })}
          suffix="%"
          error={!isPct(value.pct)}
          helper={`= ${toPoints(max, value.pct)} баллов`}
        />
        <TextField
          label="Подсказка для руководителя"
          helperText={hint}
          multiline
          minRows={3}
          value={value.desc}
          onChange={(e) => onChange({ desc: e.target.value })}
        />
      </Box>
    </Paper>
  );
}

/** Вкладка админа: веса показателей начисления, бюджет отдела и подсказки руководителям. */
export function AwardSettingsForm() {
  const [saved, setSaved] = useState<AwardSettings | null>(null);
  const [draft, setDraft] = useState<AwardSettings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    fetchAwardSettings()
      .then((s) => {
        setSaved(s);
        setDraft(s);
      })
      .catch((e) => setLoadError(String(e.message || e)));
  }, []);

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!draft || !saved)
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );

  const max = draft.maxPerEmployee;
  const levels = PRO_OPTS.map((k) => draft.pro.levels[k]);
  const proMax = Math.max(...levels.map((l) => l.pct));
  const total = draft.rez.pct + proMax + draft.unknown.pct + draft.free.pct;

  const errors: string[] = [];
  if (!Number.isInteger(max) || max <= 0)
    errors.push('Максимум на сотрудника — целое число больше 0.');
  if (!isPct(draft.budgetPct))
    errors.push('Бюджет — целое число от 0 до 100%.');
  if (
    ![draft.rez, draft.unknown, draft.free, ...levels].every((i) =>
      isPct(i.pct),
    )
  )
    errors.push('Веса показателей — целые числа от 0 до 100%.');
  else if (total > 100)
    errors.push(
      `Сотрудник со всеми показателями получит ${total}% от максимума — больше 100%. Уменьшите веса.`,
    );

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const patch = (p: Partial<AwardSettings>) => {
    setResult(null);
    setDraft({ ...draft, ...p });
  };
  const patchIndicator =
    (key: 'rez' | 'unknown' | 'free') => (p: Partial<Indicator>) =>
      patch({ [key]: { ...draft[key], ...p } });
  const patchLevel = (k: (typeof PRO_OPTS)[number], p: Partial<Indicator>) =>
    patch({
      pro: {
        ...draft.pro,
        levels: { ...draft.pro.levels, [k]: { ...draft.pro.levels[k], ...p } },
      },
    });

  const save = async () => {
    setSaving(true);
    setResult(null);
    try {
      const s = await saveAwardSettings(draft);
      setSaved(s);
      setDraft(s);
      setResult({
        ok: true,
        text: 'Сохранено. Руководители увидят изменения при следующей загрузке.',
      });
    } catch (e) {
      setResult({ ok: false, text: String((e as Error).message || e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 900 }}
    >
      <Typography color="text.secondary">
        Максимум на сотрудника задаётся в баллах, всё остальное — в процентах от
        него. Сумма результативности, максимального уровня проактивности,
        благодарностей и свободного показателя не может быть больше 100%,
        поэтому сотрудник не получит больше максимума. Бюджет отдела = бюджет на
        человека × число сотрудников.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          Лимиты
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <NumberField
            label="Максимум на сотрудника"
            value={max}
            onChange={(v) => patch({ maxPerEmployee: v })}
            suffix="баллов"
            error={!Number.isInteger(max) || max <= 0}
          />
          <NumberField
            label="Бюджет отдела на человека"
            value={draft.budgetPct}
            onChange={(v) => patch({ budgetPct: v })}
            suffix="%"
            error={!isPct(draft.budgetPct)}
            helper={`= ${toPoints(max, draft.budgetPct)} баллов на человека`}
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Максимум по всем показателям: <b>{total}%</b> из 100% (
            {toPoints(max, total)} из {Number.isFinite(max) ? max : '—'} баллов)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Number.isFinite(total) ? total : 0)}
            color={total > 100 ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      <IndicatorSection
        title="Результативность"
        hint="Показывается руководителю по кнопке «?» рядом с показателем."
        value={draft.rez}
        max={max}
        onChange={patchIndicator('rez')}
      />

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          Проактивность
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Руководитель выбирает один уровень. В сумму идёт максимальный из весов
          уровней ({proMax}%).
        </Typography>
        <TextField
          label="Общая подсказка для руководителя"
          fullWidth
          multiline
          minRows={2}
          value={draft.pro.desc}
          onChange={(e) =>
            patch({ pro: { ...draft.pro, desc: e.target.value } })
          }
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PRO_OPTS.map((k) => {
            const l = draft.pro.levels[k];
            return (
              <Box
                key={k}
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  flexWrap: { xs: 'wrap', md: 'nowrap' },
                }}
              >
                <Typography sx={{ fontWeight: 700, width: 24, pt: 1 }}>
                  {k}
                </Typography>
                <NumberField
                  label="Вес"
                  value={l.pct}
                  onChange={(pct) => patchLevel(k, { pct })}
                  suffix="%"
                  error={!isPct(l.pct)}
                  helper={`= ${toPoints(max, l.pct)} баллов`}
                />
                <TextField
                  label={`Описание уровня ${k}`}
                  fullWidth
                  multiline
                  size="small"
                  value={l.desc}
                  onChange={(e) => patchLevel(k, { desc: e.target.value })}
                />
              </Box>
            );
          })}
        </Box>
      </Paper>

      <IndicatorSection
        title="Благодарности"
        hint="Показывается руководителю по кнопке «?» рядом с показателем."
        value={draft.unknown}
        max={max}
        onChange={patchIndicator('unknown')}
      />

      <IndicatorSection
        title="Свободный"
        hint="Показывается руководителю по кнопке «?» рядом с показателем. Комментарий к этому показателю обязателен."
        value={draft.free}
        max={max}
        onChange={patchIndicator('free')}
      />

      {errors.map((e) => (
        <Alert key={e} severity="error">
          {e}
        </Alert>
      ))}
      {result && (
        <Alert severity={result.ok ? 'success' : 'error'}>{result.text}</Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={save}
          disabled={!dirty || errors.length > 0 || saving}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
        <Button onClick={() => setDraft(saved)} disabled={!dirty || saving}>
          Отменить изменения
        </Button>
        <Typography variant="body2" color="text.secondary">
          Изменено: {new Date(saved.updatedAt).toLocaleString('ru-RU')}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Изменения применяются к следующим начислениям. Уже отправленные
        начисления не пересчитываются.
      </Typography>
    </Box>
  );
}
