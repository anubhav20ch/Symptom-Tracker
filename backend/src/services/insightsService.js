const { query } = require('../config/db');

/**
 * Computes deep insights from user symptom entries:
 * 1. Trigger correlation: e.g. "68% of your Headaches logged 'Poor Sleep' as a trigger"
 * 2. Frequent body locations
 * 3. Average severity breakdown by category
 * 4. Day of week & time distribution
 * 5. Chronic condition compliance and recurrence flags
 */
async function computeUserInsights(userId) {
  // 1. Fetch all entries with symptom info
  const entriesRes = await query(
    `SELECT se.*, s.name as symptom_name, s.category as symptom_category
     FROM symptom_entries se
     JOIN symptoms s ON se.symptom_id = s.id
     WHERE se.user_id = $1
     ORDER BY se.started_at DESC`,
    [userId]
  );

  const entries = entriesRes.rows;
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      triggerCorrelations: [],
      symptomBreakdown: [],
      locationDistribution: [],
      severityDistribution: { mild: 0, moderate: 0, severe: 0, urgent: 0 },
      insightsSummary: [
        'Log a few symptoms to see automated trigger correlations and patterns here.'
      ]
    };
  }

  // --- TRIGGER CORRELATIONS ---
  // Group by symptom and count triggers
  const symptomTriggers = {};
  entries.forEach((e) => {
    const sName = e.symptom_name;
    const trig = (e.trigger || 'None Reported').trim();
    if (!symptomTriggers[sName]) {
      symptomTriggers[sName] = { total: 0, triggers: {}, avgSeverity: 0, severities: [] };
    }
    symptomTriggers[sName].total += 1;
    symptomTriggers[sName].triggers[trig] = (symptomTriggers[sName].triggers[trig] || 0) + 1;
    symptomTriggers[sName].severities.push(e.severity);
  });

  const triggerCorrelations = [];
  const insightsSummary = [];

  Object.entries(symptomTriggers).forEach(([symptom, data]) => {
    data.avgSeverity = (data.severities.reduce((a, b) => a + b, 0) / data.total).toFixed(1);

    // Find top trigger (excluding 'None' if possible)
    const sortedTriggers = Object.entries(data.triggers).sort((a, b) => b[1] - a[1]);

    const topTrigger = sortedTriggers[0];
    if (topTrigger && data.total >= 2) {
      const percentage = Math.round((topTrigger[1] / data.total) * 100);
      const isMeaningful =
        !topTrigger[0].toLowerCase().includes('none') &&
        !topTrigger[0].toLowerCase().includes('unknown');

      triggerCorrelations.push({
        symptom,
        trigger: topTrigger[0],
        occurrences: topTrigger[1],
        totalOccurrences: data.total,
        percentage,
        avgSeverity: data.avgSeverity,
        significance: percentage >= 50 ? 'High' : 'Moderate'
      });

      if (isMeaningful && percentage >= 40) {
        insightsSummary.push(
          `${percentage}% of your logged ${symptom} episodes (${topTrigger[1]}/${data.total}) cited "${topTrigger[0]}" as a trigger.`
        );
      }
    }
  });

  // --- SEVERITY DISTRIBUTION ---
  const severityDistribution = {
    mild: entries.filter((e) => e.severity <= 3).length,
    moderate: entries.filter((e) => e.severity >= 4 && e.severity <= 6).length,
    severe: entries.filter((e) => e.severity >= 7 && e.severity <= 8).length,
    urgent: entries.filter((e) => e.severity >= 9 || e.classification_type === 'urgent').length
  };

  // --- LOCATION DISTRIBUTION ---
  const locationCounts = {};
  entries.forEach((e) => {
    const loc = e.body_location || 'General Body';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });

  const locationDistribution = Object.entries(locationCounts)
    .map(([location, count]) => ({
      location,
      count,
      percentage: Math.round((count / entries.length) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  // --- CATEGORY BREAKDOWN ---
  const categoryCounts = {};
  entries.forEach((e) => {
    const cat = e.symptom_category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const symptomBreakdown = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / entries.length) * 100)
  }));

  // Add general helpful observations
  const urgentCount = entries.filter((e) => e.classification_type === 'urgent').length;
  if (urgentCount > 0) {
    insightsSummary.unshift(
      `⚠️ You have ${urgentCount} urgent alert record(s) in your history. Review your doctor visit notes.`
    );
  }

  const recurringCount = entries.filter((e) => e.classification_type === 'recurring').length;
  if (recurringCount > 0) {
    insightsSummary.push(
      `🔄 ${recurringCount} episode(s) triggered 30-day recurring flags. Consider tracking preventative lifestyle factors.`
    );
  }

  return {
    totalEntries: entries.length,
    triggerCorrelations,
    symptomBreakdown,
    locationDistribution,
    severityDistribution,
    insightsSummary
  };
}

module.exports = {
  computeUserInsights
};
